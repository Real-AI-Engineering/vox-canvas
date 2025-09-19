// Demo data without importing types

export const demoTranscripts = [
  {
    id: "demo-t-1",
    time: "10:05",
    text: "Today we'll explore the AI Workshop Assistant architecture and synchronization between frontend and backend.",
    speaker: "Host",
  },
  {
    id: "demo-t-2",
    time: "10:07",
    text: "Cards are generated on demand, so we need fast OpenAI response and local caching.",
    speaker: "Host",
  },
  {
    id: "demo-t-3",
    time: "10:09",
    text: "Participants will be able to see new cards on the projector and return to history through the side panel.",
    speaker: "Host",
  },
];

export const demoCards = [
  {
    id: "demo-c-1",
    title: "Workshop Architecture",
    content: `# Workshop Architecture\n- React frontend displays cards and transcripts.\n- WebSocket stream processes audio and updates.\n- FastAPI coordinates STT and content generation.`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-c-2",
    title: "MVP Tasks",
    content: `# MVP Tasks\n- Real-time: minimal delay between speech and text.\n- Session control: start/stop recording, JSON export.\n- Visualization: large cards + navigation for audience.`,
    createdAt: new Date().toISOString(),
  },
];