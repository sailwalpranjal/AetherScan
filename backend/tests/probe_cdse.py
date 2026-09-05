import httpx
import asyncio

async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Try CDSE OData to find S5P NO2 products
        r = await client.get(
            "https://catalogue.dataspace.copernicus.eu/odata/v1/Products",
            params={
                "$filter": "Collection/Name eq 'SENTINEL-5P' and contains(Name,'L2__NO2___')",
                "$top": 2,
                "$orderby": "ContentDate/Start desc",
            }
        )
        print("CDSE OData Status:", r.status_code)
        if r.status_code == 200:
            d = r.json()
            for p in d.get("value", []):
                print("  Product:", p.get("Name"), p.get("ContentDate", {}).get("Start"))
        else:
            print("  Error:", r.text[:200])
        
        # Try CDSE STAC search with different approach — no "query" extension
        print("\n--- STAC direct search ---")
        r2 = await client.post(
            "https://catalogue.dataspace.copernicus.eu/stac/search",
            json={
                "bbox": [68.0, 6.0, 97.5, 37.5],
                "datetime": "2024-01-01T00:00:00Z/2024-01-03T23:59:59Z",
                "limit": 2,
            },
            headers={"Content-Type": "application/json"},
        )
        print("STAC no-collection search:", r2.status_code)
        d2 = r2.json()
        for f in d2.get("features", [])[:3]:
            print("  Feature:", f.get("id"), f.get("collection"))

asyncio.run(main())
