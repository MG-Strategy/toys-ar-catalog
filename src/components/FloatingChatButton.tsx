const FloatingChatButton = () => (
  <button
    onClick={() => alert('Chatbot próximamente 🚀')}
    title="¡Cotizá por chat!"
    className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl shadow-xl hover:scale-110 transition-transform animate-pulse-chat"
    style={{ animationDuration: '2s' }}
  >
    💬
  </button>
);

export default FloatingChatButton;
