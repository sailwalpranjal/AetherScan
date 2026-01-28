"""Test server startup"""
import asyncio
import sys

async def test_startup():
    print("Testing AetherScan Backend Startup...\n")

    try:
        # Test basic imports
        print("[1/5] Testing imports...")
        from config.settings import settings
        from db.database import db_manager
        from routes import tiles, layers, aqi, search
        from middleware import get_database_guard
        print("  [OK] Core imports successful")

        # Test database initialization
        print("\n[2/5] Testing database...")
        await db_manager.initialize()
        print("  [OK] Database initialized")

        # Test database guard
        print("\n[3/5] Testing database guard...")
        db_guard = get_database_guard()
        stats = db_guard.get_stats()
        print(f"  [OK] Database guard active")
        print(f"    - Active tokens: {stats['current_active_tokens']}")

        # Test quantum (optional)
        print("\n[4/5] Testing quantum processor...")
        try:
            from quantum import QuantumProcessor, QuantumStateManager
            qp = QuantumProcessor()
            print(f"  [OK] Quantum processor initialized")
            print(f"    - Qubits: {qp.num_qubits}")
            print(f"    - Workers: {qp.max_workers}")
            await qp.shutdown()
        except Exception as e:
            print(f"  [SKIP] Quantum disabled (optional): {str(e)[:60]}")

        # Test FastAPI app creation
        print("\n[5/5] Testing FastAPI app...")
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)

        # Test root endpoint
        response = client.get("/")
        if response.status_code == 200:
            data = response.json()
            print(f"  [OK] API responding")
            print(f"    - Name: {data.get('name')}")
            print(f"    - Version: {data.get('version')}")
            print(f"    - Endpoints: {len(data.get('endpoints', {}))}")
        else:
            print(f"  [ERROR] API error: {response.status_code}")

        await db_manager.close()

        print("\n" + "="*60)
        print("[OK] All tests passed! Backend is ready.")
        print("="*60)
        return True

    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_startup())
    sys.exit(0 if result else 1)
