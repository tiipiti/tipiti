from django.core.paginator import Paginator
from rest_framework.pagination import PageNumberPagination


class FlexiblePageNumberPagination(PageNumberPagination):
    django_paginator_class = Paginator
    page_size_query_param = "page_size"
    max_page_size = 100
