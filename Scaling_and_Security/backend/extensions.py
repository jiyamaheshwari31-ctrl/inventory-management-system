from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# In-memory counters are per container. With 3 backends behind Nginx the real
# ceiling is ~3x the configured limit; use Redis (storage_uri) to share counters.
limiter = Limiter(get_remote_address, storage_uri="memory://")
