// const OpenAIService = require("../../../core/domain/entities/OpenAiService");
// const AnthropicService = require("../../../core/domain/entities/AnthropicService");
// const systemPrompt = require("./systemPrompt");

// const openAIService = new OpenAIService(process.env.OPEN_AI_API_KEY);
// const anthropicService = new AnthropicService(process.env.CLAUDE_API_KEY);

// exports.gptResponse = async (req, res) => {
//   try {
//     const { message: userMessage, threadId } = req.body;

//     if (!userMessage) {
//       return res.status(400).json({ error: "No message provided" });
//     }

//     let thread = threadId
//       ? { id: threadId }
//       : await openAIService.createThread();
//     const assistant = await openAIService.createAssistant(systemPrompt);

//     await openAIService.addMessageToThread(thread.id, userMessage);

//     res.writeHead(200, {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive",
//     });

//     const runStream = openAIService.streamRun(thread.id, assistant.id);

//     runStream
//       .on("textCreated", (text) => {
//         res.write(`data: ${JSON.stringify({ type: "content", text })}\n\n`);
//       })
//       .on("textDelta", (textDelta) => {
//         const deltaText =
//           typeof textDelta.value === "string"
//             ? textDelta.value
//             : JSON.stringify(textDelta.value);
//         res.write(
//           `data: ${JSON.stringify({ type: "content", text: deltaText })}\n\n`
//         );
//       })
//       .on("toolCallCreated", (toolCall) => {
//         res.write(
//           `data: ${JSON.stringify({
//             type: "toolCall",
//             tool: toolCall.type,
//           })}\n\n`
//         );
//       })
//       .on("toolCallDelta", (toolCallDelta) => {
//         if (toolCallDelta.type === "code_interpreter") {
//           if (toolCallDelta.code_interpreter.input) {
//             res.write(
//               `data: ${JSON.stringify({
//                 type: "input",
//                 input: toolCallDelta.code_interpreter.input,
//               })}\n\n`
//             );
//           }
//           if (toolCallDelta.code_interpreter.outputs) {
//             res.write(
//               `data: ${JSON.stringify({
//                 type: "output",
//                 output: toolCallDelta.code_interpreter.outputs,
//               })}\n\n`
//             );
//           }
//         }
//       })
//       .on("end", () => {
//         res.write(
//           `data: ${JSON.stringify({ type: "done", threadId: thread.id })}\n\n`
//         );
//         res.end();
//       })
//       .on("error", (error) => {
//         console.error("Error in streaming response:", error);
//         res.status(500).json({ error: "Failed to stream response from AI" });
//       });
//   } catch (error) {
//     console.error("Error in generating AI response:", error);
//     res.status(500).json({ error: "Failed to generate response from AI" });
//   }
// };

// exports.chatAnthropicResponse = async (req, res) => {
//   try {
//     const { messages } = req.body;

//     if (!messages || !messages.length) {
//       return res.status(400).json({ error: "Messages are required" });
//     }

//     res.writeHead(200, {
//       "Content-Type": "text/event-stream",
//       Connection: "keep-alive",
//       "Cache-Control": "no-cache",
//     });

//     const stream = await anthropicService.streamMessages(
//       messages,
//       systemPrompt
//     );

//     stream.on("text", (text) => {
//       res.write(`data: ${JSON.stringify({ type: "content", text })}\n\n`);
//     });

//     stream.on("end", () => {
//       res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
//       res.end();
//     });

//     stream.on("error", (error) => {
//       console.error("Stream error:", error);
//       res.write(
//         `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`
//       );
//       res.end();
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     res
//       .status(500)
//       .json({ error: "An error occurred while processing your request" });
//   }
// };

const OpenAIService = require("../../../core/domain/entities/OpenAiService");
const AnthropicService = require("../../../core/domain/entities/AnthropicService");
const systemPrompt = require("./systemPrompt");

exports.gptResponse = async (req, res) => {
  try {
    const { message: userMessage, threadId, apiKey } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: "No message provided" });
    }

    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    const openAIService = new OpenAIService(apiKey);

    let thread = threadId
      ? { id: threadId }
      : await openAIService.createThread();
    const assistant = await openAIService.createAssistant(systemPrompt);

    await openAIService.addMessageToThread(thread.id, userMessage);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const runStream = openAIService.streamRun(thread.id, assistant.id);

    runStream
      .on("textCreated", (text) => {
        res.write(`data: ${JSON.stringify({ type: "content", text })}\n\n`);
      })
      .on("textDelta", (textDelta) => {
        const deltaText =
          typeof textDelta.value === "string"
            ? textDelta.value
            : JSON.stringify(textDelta.value);
        res.write(
          `data: ${JSON.stringify({ type: "content", text: deltaText })}\n\n`
        );
      })
      .on("toolCallCreated", (toolCall) => {
        res.write(
          `data: ${JSON.stringify({
            type: "toolCall",
            tool: toolCall.type,
          })}\n\n`
        );
      })
      .on("toolCallDelta", (toolCallDelta) => {
        if (toolCallDelta.type === "code_interpreter") {
          if (toolCallDelta.code_interpreter.input) {
            res.write(
              `data: ${JSON.stringify({
                type: "input",
                input: toolCallDelta.code_interpreter.input,
              })}\n\n`
            );
          }
          if (toolCallDelta.code_interpreter.outputs) {
            res.write(
              `data: ${JSON.stringify({
                type: "output",
                output: toolCallDelta.code_interpreter.outputs,
              })}\n\n`
            );
          }
        }
      })
      .on("end", () => {
        res.write(
          `data: ${JSON.stringify({ type: "done", threadId: thread.id })}\n\n`
        );
        res.end();
      })
      .on("error", (error) => {
        console.error("Error in streaming response:", error);
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message: error.message || "Failed to stream response from AI",
          })}\n\n`
        );
        res.end();
      });
  } catch (error) {
    console.error("Error in generating AI response:", error);
    res.status(500).json({ error: "Failed to generate response from AI" });
  }
};

exports.chatAnthropicResponse = async (req, res) => {
  try {
    const { messages, apiKey } = req.body;

    if (!messages || !messages.length) {
      return res.status(400).json({ error: "Messages are required" });
    }

    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    const anthropicService = new AnthropicService(apiKey);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    });

    const stream = await anthropicService.streamMessages(
      messages,
      systemPrompt
    );

    stream.on("text", (text) => {
      res.write(`data: ${JSON.stringify({ type: "content", text })}\n\n`);
    });

    stream.on("end", () => {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    });

    stream.on("error", (error) => {
      console.error("Stream error:", error);
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message:
            error.message || "An error occurred while streaming the response",
        })}\n\n`
      );
      res.end();
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "An error occurred while processing your request",
      message: error.message,
    });
  }
};
