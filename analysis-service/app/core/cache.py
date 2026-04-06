import json
import functools
from fastapi import Request, Response
from typing import Optional

def cache_response(ttl: int = 300, key_prefix: str = "cache"):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to find 'request' in kwargs or args
            request: Optional[Request] = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if not request:
                return await func(*args, **kwargs)

            # Generate cache key based on URL and company_id if present
            # We assume company_id is in kwargs or path
            company_id = kwargs.get("company_id") or kwargs.get("budget_id")
            path = request.url.path
            cache_key = f"{key_prefix}:{company_id}:{path}"

            redis = request.app.state.redis
            
            # Try to get from cache
            cached_data = await redis.get(cache_key)
            if cached_data:
                print(f"DEBUG: Cache hit for {cache_key}")
                return json.loads(cached_data)

            # Execution
            result = await func(*args, **kwargs)
            
            # Store in cache
            if result:
                print(f"DEBUG: Cache miss for {cache_key}. Storing result.")
                await redis.setex(cache_key, ttl, json.dumps(result, default=str))
            
            return result
        return wrapper
    return decorator

async def clear_analysis_cache(redis, company_id: str = None, budget_id: str = None):
    if not redis:
        return
    
    patterns = []
    if company_id:
        patterns.append(f"company_analysis:{company_id}:*")
    if budget_id:
        patterns.append(f"budget_analysis:{budget_id}:*")
    
    for pattern in patterns:
        keys = await redis.keys(pattern)
        if keys:
            print(f"DEBUG: Clearing {len(keys)} keys for pattern {pattern}")
            await redis.delete(*keys)
