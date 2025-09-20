"""
Object tracking module for video processing.
Implements centroid-based tracking to associate objects across frames.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import OrderedDict
import math

from .schemas import Detection


class CentroidTracker:
    """
    Simple centroid-based object tracker.
    Tracks objects across frames by computing centroids and associating
    them based on minimum distance.
    """
    
    def __init__(self, max_disappeared: int = 30, max_distance: float = 100.0):
        """
        Initialize the centroid tracker.
        
        Args:
            max_disappeared: Maximum number of frames an object can disappear
            max_distance: Maximum distance for associating objects between frames
        """
        self.next_object_id = 0
        self.objects = OrderedDict()  # object_id -> centroid
        self.disappeared = OrderedDict()  # object_id -> disappeared_count
        self.object_labels = OrderedDict()  # object_id -> label
        self.object_sizes = OrderedDict()  # object_id -> (width, height)
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance
        
    def register_object(self, centroid: Tuple[float, float], label: str, size: Tuple[float, float]):
        """Register a new object with the tracker."""
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.object_labels[self.next_object_id] = label
        self.object_sizes[self.next_object_id] = size
        self.next_object_id += 1
        
    def deregister_object(self, object_id: int):
        """Remove an object from tracking."""
        del self.objects[object_id]
        del self.disappeared[object_id]
        del self.object_labels[object_id]
        del self.object_sizes[object_id]
        
    def update(self, detections: List[Detection]) -> Dict[int, Dict]:
        """
        Update the tracker with new detections.
        
        Args:
            detections: List of detections from current frame
            
        Returns:
            Dictionary mapping object_id to object info
        """
        # If no detections, mark all existing objects as disappeared
        if len(detections) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister_object(object_id)
            return self._get_current_objects()
        
        # Calculate centroids and sizes for new detections
        input_centroids = []
        input_labels = []
        input_sizes = []
        
        for detection in detections:
            bbox = detection.bbox
            cx = (bbox.x1 + bbox.x2) / 2.0
            cy = (bbox.y1 + bbox.y2) / 2.0
            width = bbox.x2 - bbox.x1
            height = bbox.y2 - bbox.y1
            
            input_centroids.append((cx, cy))
            input_labels.append(detection.label)
            input_sizes.append((width, height))
        
        # If no existing objects, register all detections as new objects
        if len(self.objects) == 0:
            for i in range(len(input_centroids)):
                self.register_object(input_centroids[i], input_labels[i], input_sizes[i])
        else:
            # Match existing objects to new detections
            self._match_objects(input_centroids, input_labels, input_sizes)
            
        return self._get_current_objects()
    
    def _match_objects(self, input_centroids: List[Tuple[float, float]], 
                      input_labels: List[str], input_sizes: List[Tuple[float, float]]):
        """Match existing objects to new detections."""
        object_centroids = list(self.objects.values())
        object_ids = list(self.objects.keys())
        
        # Compute distance matrix between existing objects and new detections
        D = np.linalg.norm(np.array(object_centroids)[:, np.newaxis] - input_centroids, axis=2)
        
        # Find the minimum values and sort by distance
        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]
        
        # Track which row and column indices have been used
        used_row_idxs = set()
        used_col_idxs = set()
        
        # Match objects based on minimum distance and same label
        for (row, col) in zip(rows, cols):
            if row in used_row_idxs or col in used_col_idxs:
                continue
            
            # Check if distance is acceptable and labels match
            object_id = object_ids[row]
            distance = D[row, col]
            
            if (distance <= self.max_distance and 
                self.object_labels[object_id] == input_labels[col]):
                
                # Update object position and reset disappeared counter
                self.objects[object_id] = input_centroids[col]
                self.disappeared[object_id] = 0
                self.object_sizes[object_id] = input_sizes[col]
                
                used_row_idxs.add(row)
                used_col_idxs.add(col)
        
        # Handle unmatched detections and objects
        unused_row_idxs = set(range(0, D.shape[0])).difference(used_row_idxs)
        unused_col_idxs = set(range(0, D.shape[1])).difference(used_col_idxs)
        
        # If more objects than detections, mark missing objects as disappeared
        if D.shape[0] >= D.shape[1]:
            for row in unused_row_idxs:
                object_id = object_ids[row]
                self.disappeared[object_id] += 1
                
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister_object(object_id)
        
        # If more detections than objects, register new objects
        else:
            for col in unused_col_idxs:
                # Only register if it's a reasonable distance from existing objects
                min_distance_to_existing = float('inf')
                if len(object_centroids) > 0:
                    distances_to_existing = [
                        math.sqrt((input_centroids[col][0] - oc[0])**2 + 
                                 (input_centroids[col][1] - oc[1])**2)
                        for oc in object_centroids
                    ]
                    min_distance_to_existing = min(distances_to_existing)
                
                # Register as new object if far enough from existing ones
                if min_distance_to_existing > self.max_distance * 0.5:
                    self.register_object(input_centroids[col], input_labels[col], input_sizes[col])
    
    def _get_current_objects(self) -> Dict[int, Dict]:
        """Get current tracked objects."""
        current_objects = {}
        for object_id in self.objects.keys():
            current_objects[object_id] = {
                'centroid': self.objects[object_id],
                'label': self.object_labels[object_id],
                'size': self.object_sizes[object_id],
                'disappeared': self.disappeared[object_id]
            }
        return current_objects
    
    def get_unique_counts(self) -> Dict[str, int]:
        """Get count of unique objects by label."""
        counts = {}
        for object_id in self.objects.keys():
            label = self.object_labels[object_id]
            counts[label] = counts.get(label, 0) + 1
        return counts
    
    def get_total_unique_objects(self) -> int:
        """Get total number of unique objects tracked."""
        return len(self.objects)
