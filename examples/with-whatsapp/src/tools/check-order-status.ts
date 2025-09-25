import { createTool } from "@voltagent/core";
import { z } from "zod";
import { supabase } from "../../lib/supabase";

export const checkOrderStatusTool = createTool({
  name: "checkOrderStatus",
  description: "Checks the status of a customer's order(s) from the database",
  parameters: z.object({
    orderId: z.number().optional().describe("Specific order ID to check"),
  }),
  execute: async ({ orderId }, context) => {
    try {
      // Always get customer phone from context
      const customerPhone = context?.userId;

      if (!customerPhone) {
        return {
          success: false,
          message: "Customer phone number not found. Please login to the system.",
        };
      }

      let query = supabase
        .from("orders")
        .select(`
          id,
          customer_phone,
          customer_address,
          total_amount,
          status,
          created_at,
          order_items (
            id,
            menu_item_id,
            quantity,
            price
          )
        `)
        .eq("customer_phone", customerPhone); // Always filter by customer phone from context

      // Add additional filter if orderId is provided
      if (orderId) {
        query = query.eq("id", orderId);
      }

      // Order by most recent first
      query = query.order("created_at", { ascending: false });

      // Limit to last 5 orders if not searching for specific order
      if (!orderId) {
        query = query.limit(5);
      }

      const { data: orders, error } = await query;

      if (error) {
        throw new Error(`Failed to query orders: ${error.message}`);
      }

      if (!orders || orders.length === 0) {
        return {
          success: false,
          message: orderId ? `Order #${orderId} not found.` : `You don't have any orders yet.`,
        };
      }

      // Format status messages
      const statusMessages: Record<string, string> = {
        pending: "Pending",
        preparing: "Preparing",
        ready: "Ready",
        on_the_way: "On the Way",
        delivered: "Delivered",
        cancelled: "Cancelled",
      };

      // Format order details
      const formattedOrders = orders.map((order) => ({
        orderNumber: order.id,
        status: statusMessages[order.status] || order.status,
        totalAmount: order.total_amount,
        deliveryAddress: order.customer_address,
        orderDate: new Date(order.created_at).toLocaleString("en-US"),
        itemCount: order.order_items?.length || 0,
      }));

      if (orderId) {
        // Single order query
        const order = formattedOrders[0];
        return {
          success: true,
          message: `Order #${order.orderNumber}\nStatus: ${order.status}\nTotal: $${order.totalAmount}\nDelivery Address: ${order.deliveryAddress}\nOrder Date: ${order.orderDate}`,
          order: order,
        };
      }
      // Multiple orders query
      const orderList = formattedOrders
        .map(
          (order, index) =>
            `${index + 1}. Order #${order.orderNumber} - ${order.status} - $${order.totalAmount}`,
        )
        .join("\n");

      return {
        success: true,
        message: `Your recent orders:\n${orderList}`,
        orders: formattedOrders,
        totalOrders: formattedOrders.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "An error occurred while querying order status",
        message: "Sorry, we cannot query your order status right now. Please try again later.",
      };
    }
  },
});
