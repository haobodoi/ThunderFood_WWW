import Icon from './Icon.jsx';

export default function FeatureCard({ icon, title, description, soon = true }) {
  return (
    <div className="feature-card">
      <div className="feature-card__icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="feature-card__body">
        <div className="feature-card__title">
          {title}
          {soon && <span className="tag">Sắp có</span>}
        </div>
        <p className="feature-card__desc">{description}</p>
      </div>
    </div>
  );
}
