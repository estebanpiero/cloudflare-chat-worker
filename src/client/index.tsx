import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router";
import { nanoid } from "nanoid";
import { type ChatMessage, type Message } from "../shared";

function App() {
  const [name, setName] = useState<string>(
    () => localStorage.getItem("chat-username") || ""
  );
  const [pendingName, setPendingName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { room } = useParams();

  const socket = usePartySocket({
    party: "chat",
    room,
    onMessage: (evt) => {
      const message = JSON.parse(evt.data as string) as Message;
      if (message.type === "add") {
        const foundIndex = messages.findIndex((m) => m.id === message.id);
        if (foundIndex === -1) {
          // probably someone else who added a message
          setMessages((messages) => [
            ...messages,
            {
              id: message.id,
              content: message.content,
              user: message.user,
              role: message.role,
            },
          ]);
        } else {
          // this usually means we ourselves added a message
          // and it was broadcasted back
          // so let's replace the message with the new message
          setMessages((messages) => {
            return messages
              .slice(0, foundIndex)
              .concat({
                id: message.id,
                content: message.content,
                user: message.user,
                role: message.role,
              })
              .concat(messages.slice(foundIndex + 1));
          });
        }
      } else if (message.type === "update") {
        setMessages((messages) =>
          messages.map((m) =>
            m.id === message.id
              ? {
                  id: message.id,
                  content: message.content,
                  user: message.user,
                  role: message.role,
                }
              : m,
          ),
        );
      } else {
        setMessages(message.messages);
      }
    },
  });

  // Show username entry screen if no name is set
  if (!name) {
    return (
      <div className="chat container">
        <div className="row" style={{ marginTop: "2rem" }}>
          <h4>Choose a username to join the chat</h4>
        </div>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = pendingName.trim();
            if (trimmed) {
              localStorage.setItem("chat-username", trimmed);
              setName(trimmed);
            }
          }}
        >
          <input
            type="text"
            className="ten columns my-input-text"
            placeholder="Enter your username..."
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          <button type="submit" className="two columns">
            Join
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat container">
      <div className="row" style={{ marginBottom: "0.5rem", color: "#888" }}>
        Chatting as <strong>{name}</strong>
        <button
          style={{ marginLeft: "1rem", fontSize: "0.8em" }}
          onClick={() => {
            localStorage.removeItem("chat-username");
            setName("");
          }}
        >
          Change name
        </button>
      </div>
      {messages.map((message) => (
        <div key={message.id} className="row message">
          <div className="two columns user">{message.user}</div>
          <div className="ten columns">{message.content}</div>
        </div>
      ))}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const content = e.currentTarget.elements.namedItem(
            "content",
          ) as HTMLInputElement;
          const chatMessage: ChatMessage = {
            id: nanoid(8),
            content: content.value,
            user: name,
            role: "user",
          };
          setMessages((messages) => [...messages, chatMessage]);
          socket.send(
            JSON.stringify({
              type: "add",
              ...chatMessage,
            } satisfies Message),
          );
          content.value = "";
        }}
      >
        <input
          type="text"
          name="content"
          className="ten columns my-input-text"
          placeholder={`Hello ${name}! Type a message...`}
          autoComplete="off"
        />
        <button type="submit" className="send-message two columns">
          Send
        </button>
      </form>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to={`/${nanoid()}`} />} />
      <Route path="/:room" element={<App />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </BrowserRouter>,
);
