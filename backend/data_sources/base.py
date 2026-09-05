from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import logging

class BaseProvider(ABC):
    """Abstract base class for all data providers."""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of the provider."""
        pass

    @abstractmethod
    async def fetch_data(self, **kwargs) -> Any:
        """Fetch data from the external source."""
        pass

    @abstractmethod
    async def process_data(self, raw_data: Any) -> Any:
        """Process and validate raw data into domain models/schemas."""
        pass

    @abstractmethod
    async def save_data(self, processed_data: Any, session) -> None:
        """Idempotent save to the database."""
        pass

    async def ingest(self, session, **kwargs) -> Dict[str, Any]:
        """
        Orchestrate the ingestion workflow: fetch -> process -> save.
        """
        self.logger.info(f"[{self.provider_name}] Starting ingestion...")
        try:
            raw_data = await self.fetch_data(**kwargs)
            if not raw_data:
                self.logger.warning(f"[{self.provider_name}] No raw data fetched.")
                return {"status": "success", "message": "No data fetched"}
            
            processed_data = await self.process_data(raw_data)
            if not processed_data:
                self.logger.warning(f"[{self.provider_name}] No data to save after processing.")
                return {"status": "success", "message": "No data after processing"}

            await self.save_data(processed_data, session)
            self.logger.info(f"[{self.provider_name}] Ingestion completed successfully.")
            return {"status": "success", "provider": self.provider_name}
        except Exception as e:
            self.logger.error(f"[{self.provider_name}] Ingestion failed: {e}", exc_info=True)
            return {"status": "error", "provider": self.provider_name, "error": str(e)}
