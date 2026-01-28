from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class AQIResult(BaseModel):
    aqi: int
    category: str
    color: str
    dominant_pollutant: str
    breakdowns: Dict[str, Dict[str, Any]]
    coordinates: Coordinates
    timestamp: str

class PollutantMeasurement(BaseModel):
    parameter: str
    value: float
    unit: str
    timestamp: str

class Station(BaseModel):
    station_id: str
    name: str
    coordinates: Coordinates
    city: Optional[str] = None
    country: Optional[str] = None
    parameters: List[str]
    latest_measurements: Optional[List[PollutantMeasurement]] = None

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    value: float
    aqi: Optional[int] = None
    category: Optional[str] = None

class TileRequest(BaseModel):
    z: int = Field(..., ge=0, le=20)
    x: int
    y: int
    layer_type: str

class LayerData(BaseModel):
    type: str
    features: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = None

class FirePoint(BaseModel):
    latitude: float
    longitude: float
    brightness: float
    confidence: str
    frp: float
    acq_date: str
    acq_time: str
    satellite: str

class Industry(BaseModel):
    name: str
    type: str
    coordinates: Coordinates
    state: Optional[str] = None
    capacity: Optional[str] = None

class PopulationData(BaseModel):
    location: str
    coordinates: Coordinates
    population: int
    density: float
    state: Optional[str] = None

class InterpolationRequest(BaseModel):
    points: List[Dict[str, float]]
    grid_resolution: float = 0.1
    bounds: Optional[Dict[str, float]] = None
    power: float = 2.0

class TimeSeriesData(BaseModel):
    timestamps: List[str]
    values: List[float]
    parameter: str
    location: Optional[str] = None

class WMSLayerInfo(BaseModel):
    name: str
    title: str
    url: str
    layers: str
    format: str = "image/png"
    transparent: bool = True
    attribution: str

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
