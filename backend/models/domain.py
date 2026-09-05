from sqlalchemy import Column, String, Float, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from db.database import Base

class OpenAQStation(Base):
    __tablename__ = "openaq_stations"

    station_id = Column(String, primary_key=True)
    name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    last_updated = Column(String, nullable=True)
    parameters = Column(String, nullable=True)  # Stored as JSON string or comma-separated

    measurements = relationship("OpenAQMeasurement", back_populates="station")

class OpenAQMeasurement(Base):
    __tablename__ = "openaq_measurements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_id = Column(String, ForeignKey("openaq_stations.station_id"))
    parameter = Column(String)
    value = Column(Float)
    unit = Column(String)
    timestamp = Column(String)

    station = relationship("OpenAQStation", back_populates="measurements")

    __table_args__ = (
        Index('idx_measurements_station', 'station_id'),
        Index('idx_measurements_timestamp', 'timestamp'),
    )

class NASAFirmsFire(Base):
    __tablename__ = "nasa_firms_fires"

    id = Column(Integer, primary_key=True, autoincrement=True)
    latitude = Column(Float)
    longitude = Column(Float)
    brightness = Column(Float)
    scan = Column(Float)
    track = Column(Float)
    acq_date = Column(String)
    acq_time = Column(String)
    satellite = Column(String)
    confidence = Column(String)
    frp = Column(Float)

    __table_args__ = (
        Index('idx_fires_date', 'acq_date'),
    )

class Industry(Base):
    __tablename__ = "industries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    type = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    state = Column(String, nullable=True)
    capacity = Column(String, nullable=True)

class PopulationData(Base):
    __tablename__ = "population_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    population = Column(Integer)
    density = Column(Float)
    state = Column(String, nullable=True)

class CacheMetadata(Base):
    __tablename__ = "cache_metadata"

    key = Column(String, primary_key=True)
    timestamp = Column(String)
    data_type = Column(String)
    expiry = Column(String)
