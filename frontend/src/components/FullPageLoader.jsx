export default function FullPageLoader({ text = 'Đang tải...' }) {
  return (
    <div className="page-loader" role="status">
      <span className="spinner" />
      <span>{text}</span>
    </div>
  );
}
