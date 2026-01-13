"""
Sync Tasks Background Tasks
"""
from celery import shared_task


@shared_task
def sample_task():
    """
    Örnek arka plan görevi
    """
    # TODO: Implement task
    pass
