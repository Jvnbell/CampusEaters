from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
from PIL import Image
import requests
import torch
import torch.nn.functional as F
import numpy as np
import matplotlib.pyplot as plt

feature_extractor = SegformerImageProcessor.from_pretrained("nvidia/segformer-b0-finetuned-cityscapes-768-768")
model = SegformerForSemanticSegmentation.from_pretrained("nvidia/segformer-b0-finetuned-cityscapes-768-768")

image = Image.open( r"C:\Users\jvnbe\Desktop\CampusEaters\RPLidar\concrete-sidewalk.jpg")

inputs = feature_extractor(images=image, return_tensors="pt")
outputs = model(**inputs)
logits = outputs.logits  # shape (batch_size, num_labels, height/4, width/4)

# Upsample logits to original image size
upsampled_logits = F.interpolate(
    logits,
    size=image.size[::-1],  # (height, width)
    mode="bilinear",
    align_corners=False
)

# Get predicted class for each pixel
predicted = upsampled_logits.argmax(dim=1).squeeze().cpu().numpy()

# Cityscapes class 1 = sidewalk
SIDEWALK_CLASS = 1
sidewalk_mask = (predicted == SIDEWALK_CLASS)

# Create overlay visualization
fig, axes = plt.subplots(1, 3, figsize=(15, 5))

# Original image
axes[0].imshow(image)
axes[0].set_title("Original Image")
axes[0].axis("off")

# Sidewalk mask
axes[1].imshow(sidewalk_mask, cmap="Greens")
axes[1].set_title("Sidewalk Detection")
axes[1].axis("off")

# Overlay: original image with sidewalk highlighted
overlay = np.array(image).copy()
overlay[sidewalk_mask] = [0, 255, 0]  # Green overlay on sidewalk
blended = (0.6 * np.array(image) + 0.4 * overlay).astype(np.uint8)
axes[2].imshow(blended)
axes[2].set_title("Sidewalk Overlay")
axes[2].axis("off")

plt.tight_layout()
plt.show()
