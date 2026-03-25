CANCELLATION_FLAGS = {}

def cancel_job(job_id: str):
    CANCELLATION_FLAGS[job_id] = True

def is_cancelled(job_id: str) -> bool:
    return CANCELLATION_FLAGS.get(job_id, False)

def clear_job(job_id: str):
    CANCELLATION_FLAGS.pop(job_id, None)
