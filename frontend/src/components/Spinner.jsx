const Spinner = ({ size = 20, className = "" }) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div 
        className="animate-spin rounded-full border border-white border-t-transparent" 
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default Spinner;
