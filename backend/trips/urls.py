from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('message/', views.api_message, name='api_message'),
    path('trip/plan/', views.plan_trip_view, name='plan_trip'),
]
