import imgLoading from '../assets/images/loading.svg';

const Loading: React.FC = () => {
  return (
    <div className="absolute w-100% h-100% top-0 left-0 flex items-center justify-center">
      <img src={imgLoading} alt="loading" width={100} height={100} className="opacity-20" />
    </div>
  );
};

export default Loading;
