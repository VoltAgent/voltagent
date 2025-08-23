// Test script to verify memory functionality
async function testMemory() {
  const baseUrl = "http://localhost:3000";

  // Test 1: Send a message to create conversation
  console.log("Test 1: Sending a message...");
  const chatResponse = await fetch(`${baseUrl}/api/chat-v2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          id: "msg1",
          role: "user",
          parts: [{ type: "text", text: "What is 2 + 2?" }],
        },
      ],
      userId: "test-user",
      conversationId: "test-conv",
    }),
  });

  if (!chatResponse.ok) {
    console.error("Failed to send message:", chatResponse.status);
    return;
  }

  // Read the stream response
  const reader = chatResponse.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullResponse += decoder.decode(value);
  }

  console.log("Received response (partial):", fullResponse.substring(0, 200));

  // Wait a bit for memory to save
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: Retrieve messages from memory
  console.log("\nTest 2: Retrieving messages from memory...");
  const messagesResponse = await fetch(
    `${baseUrl}/api/messages?userId=test-user&conversationId=test-conv`,
  );

  if (!messagesResponse.ok) {
    console.error("Failed to retrieve messages:", messagesResponse.status);
    return;
  }

  const { data: messages } = await messagesResponse.json();
  console.log(`Found ${messages.length} messages in memory`);

  if (messages.length > 0) {
    console.log("\nMessages:");
    messages.forEach((msg, i) => {
      const text = msg.parts?.find((p) => p.type === "text")?.text || "";
      console.log(
        `${i + 1}. [${msg.role}]: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`,
      );
    });
  }

  console.log("\n✅ Memory test completed successfully!");
}

testMemory().catch(console.error);
