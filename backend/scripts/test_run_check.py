import asyncio
import sys
sys.path.insert(0, '/app')

from services.scheduler_service import scheduler_service

async def main():
    print("Iniciando ejecución manual del health check ID 2...")
    print("=" * 80)
    
    # Call the execution method directly
    await scheduler_service._execute_health_check(2)
    
    print("=" * 80)
    print("Ejecución completada")

if __name__ == "__main__":
    asyncio.run(main())
