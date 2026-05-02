from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response


def index(request):
    """Serve React's index.html as the catch-all view"""
    return render(request, 'index.html')


def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({'status': 'ok', 'message': 'Django API is running!'})


@api_view(['GET'])
def api_message(request):
    """Sample API endpoint that returns a message"""
    return Response({
        'message': 'Hello from Django API!',
        'data': {
            'app': 'Spotter AI',
            'version': '1.0.0',
            'features': ['ELD Logging', 'Route Optimization', 'AI Assistant']
        }
    })
