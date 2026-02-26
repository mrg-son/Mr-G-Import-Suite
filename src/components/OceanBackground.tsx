const OceanBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Blobs */}
      <div className="blob blob-1 w-[500px] h-[500px] bg-teal/20 top-[-10%] left-[-5%]" />
      <div className="blob blob-2 w-[400px] h-[400px] bg-bleu-mer/15 top-[30%] right-[-8%]" />
      <div className="blob blob-3 w-[350px] h-[350px] bg-teal-light/10 bottom-[10%] left-[20%]" />
      <div className="blob blob-4 w-[450px] h-[450px] bg-or/8 top-[60%] right-[30%]" />
      <div className="blob blob-1 w-[300px] h-[300px] bg-bleu-mer/10 top-[10%] left-[50%]" style={{ animationDelay: '-5s' }} />
      <div className="blob blob-2 w-[350px] h-[350px] bg-teal/8 bottom-[-5%] right-[10%]" style={{ animationDelay: '-8s' }} />

      {/* Ripple rings */}
      <div className="ripple-ring w-[200px] h-[200px] top-[40%] left-[30%]" style={{ animationDelay: '0s' }} />
      <div className="ripple-ring w-[150px] h-[150px] top-[60%] right-[25%]" style={{ animationDelay: '2s' }} />
      <div className="ripple-ring w-[180px] h-[180px] top-[20%] left-[60%]" style={{ animationDelay: '3s' }} />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />
    </div>
  );
};

export default OceanBackground;
