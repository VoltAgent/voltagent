import { createTool } from "@voltagent/core";
import { z } from "zod";
import { supabase } from "../../lib/supabase";

export const createOrderTool = createTool({
  name: "createOrder",
  description: "Creates a new order with the items and delivery address from working memory",
  parameters: z.object({
    items: z
      .array(
        z.object({
          menuItemId: z.number().describe("ID of the menu item"),
          itemName: z.string().describe("Name of the menu item"),
          quantity: z.number().describe("Quantity of the item"),
          price: z.number().describe("Price per item"),
        }),
      )
      .describe("List of ordered items"),
    deliveryAddress: z.string().describe("Delivery address for the order"),
    customerNotes: z.string().optional().describe("Optional customer notes for the order"),
  }),
  execute: async ({ items, deliveryAddress }, context) => {
    try {
      // Get customer phone from context userId
      const customerPhone = context?.userId || "unknown";

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Create order in orders table
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_phone: customerPhone,
          customer_address: deliveryAddress,
          total_amount: totalAmount,
          status: "preparing",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      // Create order items in order_items table
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

      if (itemsError) {
        // If order items fail, we should ideally rollback the order
        // For now, just log the error
        console.error("Order items could not be created:", itemsError);
        throw new Error(`Failed to save order items: ${itemsError.message}`);
      }

      return {
        success: true,
        orderId: orderData.id,
        message: `Your order has been successfully created! Order number: ${orderData.id}`,
        estimatedDeliveryTime: "30-45 minutes",
        totalAmount: totalAmount,
        customerPhone: customerPhone,
        items: items,
        deliveryAddress: deliveryAddress,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred while creating order",
        message: "Sorry, we cannot process your order right now. Please try again later.",
      };
    }
  },
});
