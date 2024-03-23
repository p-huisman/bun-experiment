const socket = new WebSocket(`${location.protocol === "https:"? "wss" : "ws"}://${location.host}/build`);
socket.addEventListener("message", (event) => {
  if (event.data === "reload") location.reload();
  if (event.data === "close") socket.close();
});