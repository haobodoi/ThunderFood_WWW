package vn.edu.iuh.fit.thunderfood.dto;

/** A small, public search result. No owner, order or private restaurant data is exposed. */
public record RestaurantSuggestionDto(
        String type,
        long restaurantId,
        String restaurantName,
        Long itemId,
        String itemName,
        boolean open) {}
