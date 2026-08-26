import django_filters

from .models import PriceObservation, Promotion, ShoppingPurchase


class PriceObservationFilter(django_filters.FilterSet):
    product_id = django_filters.UUIDFilter(field_name="product__public_id")
    market_id = django_filters.UUIDFilter(field_name="branch__public_id")
    observed_on = django_filters.DateFromToRangeFilter()
    amount = django_filters.RangeFilter()

    class Meta:
        model = PriceObservation
        fields = ["is_valid"]


class PromotionFilter(django_filters.FilterSet):
    product_id = django_filters.UUIDFilter(field_name="product__public_id")
    market_id = django_filters.UUIDFilter(field_name="branch__public_id")
    network_id = django_filters.UUIDFilter(field_name="network__public_id")
    ends_on = django_filters.DateFromToRangeFilter()

    class Meta:
        model = Promotion
        fields = ["is_valid"]


class ShoppingPurchaseFilter(django_filters.FilterSet):
    market_id = django_filters.UUIDFilter(field_name="branch__public_id")
    list_id = django_filters.UUIDFilter(field_name="shopping_list__public_id")
    purchased_on = django_filters.DateFromToRangeFilter()

    class Meta:
        model = ShoppingPurchase
        fields = []
