import asyncio
import sys

from app.routes.profile import update_profile, ProfileData
from app.config import get_settings

async def test():
    user_id = "8af1f9ce-95de-4314-b0cf-c5d25e5f0740"
    data = ProfileData(
        first_name="Test",
        last_name="User",
        gender="male",
        age=25
    )
    
    try:
        res = await update_profile(user_id, data)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
