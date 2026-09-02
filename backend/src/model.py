"""
model.py
--------
PyTorch implementation of the iResNet50 backbone architecture and the
ArcMarginProduct (ArcFace) head. This module is provided for reference,
fine-tuning, or retraining purposes.
"""

import math
from typing import Tuple, List, Type, Union, Optional

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
except ImportError:
    raise ImportError(
        "PyTorch is required for model.py (training/fine-tuning reference). "
        "Install it with: pip install torch"
    )


class IBottleNeck(nn.Module):
    """
    Improved ResNet Bottleneck block with PReLU activations and BatchNorm.
    """
    expansion: int = 1

    def __init__(
        self,
        inplanes: int,
        planes: int,
        stride: int = 1,
        downsample: Optional[nn.Module] = None,
        groups: int = 1,
        base_width: int = 64,
        dilation: int = 1,
    ) -> None:
        super().__init__()
        if groups != 1 or base_width != 64:
            raise ValueError("IBottleNeck only supports groups=1 and base_width=64")
        if dilation > 1:
            raise NotImplementedError("Dilation > 1 not supported in IBottleNeck")

        self.bn1 = nn.BatchNorm2d(inplanes, eps=2e-5, momentum=0.9)
        self.conv1 = nn.Conv2d(
            inplanes, planes, kernel_size=3, stride=1, padding=1, bias=False
        )
        self.bn2 = nn.BatchNorm2d(planes, eps=2e-5, momentum=0.9)
        self.prelu = nn.PReLU(planes)
        self.conv2 = nn.Conv2d(
            planes, planes, kernel_size=3, stride=stride, padding=1, bias=False
        )
        self.bn3 = nn.BatchNorm2d(planes, eps=2e-5, momentum=0.9)
        self.downsample = downsample
        self.stride = stride

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = x

        out = self.bn1(x)
        out = self.conv1(out)
        out = self.bn2(out)
        out = self.prelu(out)
        out = self.conv2(out)
        out = self.bn3(out)

        if self.downsample is not None:
            identity = self.downsample(x)

        out += identity
        return out


class IResNet(nn.Module):
    """
    iResNet Backbone architecture for feature extraction.
    """

    def __init__(
        self,
        block: Type[IBottleNeck],
        layers: List[int],
        dropout: float = 0.0,
        embedding_size: int = 512,
        fp16: bool = False,
    ) -> None:
        super().__init__()
        self.fp16 = fp16
        self.inplanes = 64
        self.dilation = 1

        # Stem Layer
        self.stem = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(64, eps=2e-5, momentum=0.9),
            nn.PReLU(64),
        )

        # Residual Stages
        self.layer1 = self._make_layer(block, 64, layers[0], stride=2)
        self.layer2 = self._make_layer(block, 128, layers[1], stride=2)
        self.layer3 = self._make_layer(block, 256, layers[2], stride=2)
        self.layer4 = self._make_layer(block, 512, layers[3], stride=2)

        # Output Head
        self.bn_out = nn.BatchNorm2d(512, eps=2e-5, momentum=0.9)
        self.dropout = nn.Dropout(p=dropout) if dropout > 0 else nn.Identity()
        self.fc = nn.Linear(512 * 7 * 7, embedding_size, bias=False)
        self.bn_fc = nn.BatchNorm1d(embedding_size, eps=2e-5, momentum=0.9)

    def _make_layer(
        self,
        block: Type[IBottleNeck],
        planes: int,
        blocks: int,
        stride: int = 1,
    ) -> nn.Sequential:
        downsample = None
        if stride != 1 or self.inplanes != planes * block.expansion:
            downsample = nn.Sequential(
                nn.Conv2d(
                    self.inplanes,
                    planes * block.expansion,
                    kernel_size=1,
                    stride=stride,
                    bias=False,
                ),
                nn.BatchNorm2d(planes * block.expansion, eps=2e-5, momentum=0.9),
            )

        layers = [
            block(
                self.inplanes, planes, stride, downsample=downsample
            )
        ]
        self.inplanes = planes * block.expansion
        for _ in range(1, blocks):
            layers.append(block(self.inplanes, planes))

        return nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)

        x = self.bn_out(x)
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        x = self.fc(x)
        x = self.bn_fc(x)
        return x


def iresnet50(embedding_size: int = 512, **kwargs) -> IResNet:
    """Constructs an iResNet-50 model."""
    return IResNet(
        block=IBottleNeck,
        layers=[3, 4, 14, 3],
        embedding_size=embedding_size,
        **kwargs,
    )


class ArcMarginProduct(nn.Module):
    """
    ArcMarginProduct (ArcFace) Loss Head implementation.
    
    Computes angular margin penalty given target identity labels:
    $$\\cos(\\theta + m) = \\cos\\theta\\cos m - \\sin\\theta\\sin m$$
    """

    def __init__(
        self,
        in_features: int = 512,
        out_features: int = 10000,
        s: float = 64.0,
        m: float = 0.50,
        easy_margin: bool = False,
    ) -> None:
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.s = s
        self.m = m

        self.weight = nn.Parameter(torch.FloatTensor(out_features, in_features))
        nn.init.xavier_uniform_(self.weight)

        self.easy_margin = easy_margin
        self.cos_m = math.cos(m)
        self.sin_m = math.sin(m)
        self.th = math.cos(math.pi - m)
        self.mm = math.sin(math.pi - m) * m

    def forward(self, input_features: torch.Tensor, label: torch.Tensor) -> torch.Tensor:
        # Normalize weights and feature vectors
        cosine = F.linear(F.normalize(input_features), F.normalize(self.weight))
        sine = torch.sqrt(torch.clamp(1.0 - torch.pow(cosine, 2), min=1e-7))
        
        # Calculate cos(theta + m) using trigonometric angle addition formula
        phi = cosine * self.cos_m - sine * self.sin_m

        if self.easy_margin:
            phi = torch.where(cosine > 0, phi, cosine)
        else:
            phi = torch.where(cosine > self.th, phi, cosine - self.mm)

        # Convert label to one-hot vector
        one_hot = torch.zeros(cosine.size(), device=input_features.device)
        one_hot.scatter_(1, label.view(-1, 1).long(), 1)

        # Scale outputs
        output = (one_hot * phi) + ((1.0 - one_hot) * cosine)
        output *= self.s
        return output