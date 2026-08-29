import multiprocessing
import os


bind = os.getenv("PASOS_GUNICORN_BIND", "127.0.0.1:9150")
workers = int(os.getenv("PASOS_GUNICORN_WORKERS", str(max(2, multiprocessing.cpu_count() // 2))))
worker_class = "uvicorn.workers.UvicornWorker"
threads = int(os.getenv("PASOS_GUNICORN_THREADS", "2"))
timeout = int(os.getenv("PASOS_GUNICORN_TIMEOUT", "45"))
graceful_timeout = int(os.getenv("PASOS_GUNICORN_GRACEFUL_TIMEOUT", "30"))
keepalive = int(os.getenv("PASOS_GUNICORN_KEEPALIVE", "5"))
max_requests = int(os.getenv("PASOS_GUNICORN_MAX_REQUESTS", "1000"))
max_requests_jitter = int(os.getenv("PASOS_GUNICORN_MAX_REQUESTS_JITTER", "100"))
accesslog = "-"
errorlog = "-"
capture_output = True
loglevel = os.getenv("PASOS_LOG_LEVEL", "info").lower()
proc_name = "pasos-api"

