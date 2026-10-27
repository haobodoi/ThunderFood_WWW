import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { partnerRestaurantApi } from '../../api/partnerRestaurantApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import useRegistrationOptions from '../../hooks/useRegistrationOptions.js';
import { LAST_DATA_STEP, REGISTRATION_STEPS, isEditable } from '../../utils/restaurantUtils.js';
import Stepper from '../../components/Stepper.jsx';
import Alert from '../../components/Alert.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import RestaurantSummary from '../../components/RestaurantSummary.jsx';
import Icon from '../../components/Icon.jsx';
import BasicStep from './steps/BasicStep.jsx';
import RepresentativeStep from './steps/RepresentativeStep.jsx';
import BankStep from './steps/BankStep.jsx';
import DetailsStep from './steps/DetailsStep.jsx';
import ReviewStep from './steps/ReviewStep.jsx';

const firstOpenStep = (registration) => Math.min(registration.registrationStep + 1, REGISTRATION_STEPS.length);

export default function RestaurantRegisterPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { options, error: optionsError } = useRegistrationOptions();
  const [registration, setRegistration] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!id) {
      setRegistration(null);
      setStep(1);
      setLoading(false);
      return undefined;
    }
    if (registration && String(registration.id) === String(id)) return undefined;
    let active = true;
    setLoading(true);
    setLoadError('');
    partnerRestaurantApi
      .get(id)
      .then((data) => {
        if (!active) return;
        setRegistration(data);
        setStep(firstOpenStep(data));
      })
      .catch((err) => active && setLoadError(getErrorMessage(err, 'Không tải được hồ sơ đăng ký.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const goTo = (next) => {
    setStep(next);
    window.scrollTo(0, 0);
  };

  const handleSaved = (saved, nextStep) => {
    setRegistration(saved);
    goTo(nextStep);
    if (!id) navigate(`/partner/register/${saved.id}`, { replace: true });
  };

  const handleSubmitted = (saved) => {
    navigate('/partner', {
      replace: true,
      state: {
        tab: 'registrations',
        flash: `Đã gửi hồ sơ "${saved.restaurantName}". ThunderFood sẽ duyệt và phản hồi sớm nhất.`,
      },
    });
  };

  if (loading) return <FullPageLoader text="Đang tải hồ sơ..." />;

  if (loadError) {
    return (
      <div className="page">
        <Alert type="error">{loadError}</Alert>
        <Link to="/partner" className="btn btn--outline">
          <Icon name="arrowLeft" size={16} />
          Về danh sách quán
        </Link>
      </div>
    );
  }

  const editable = isEditable(registration);
  const completed = registration?.registrationStep ?? 0;
  const maxReachable = registration ? firstOpenStep(registration) : 1;

  return (
    <div className="page page--wide">
      <div className="page__head page__head--row">
        <div>
          <Link to="/partner" className="back-link">
            <Icon name="arrowLeft" size={16} />
            Quán của tôi
          </Link>
          <h1>{registration ? registration.restaurantName : 'Đăng ký quán mới'}</h1>
        </div>
        {registration && <StatusBadge status={registration.status} />}
      </div>

      {optionsError && <Alert type="error">{optionsError}</Alert>}

      {!editable ? (
        <>
          {registration.status === 'PENDING' && (
            <Alert type="warning" title="Hồ sơ đang được duyệt">
              Đăng ký của bạn đang trong quá trình duyệt. Bạn sẽ thấy quán ở mục &quot;Quán của tôi&quot; khi được duyệt.
            </Alert>
          )}
          {registration.status === 'APPROVED' && (
            <Alert type="success" title="Quán đã được duyệt">
              Quán đang hoạt động trên ThunderFood.
            </Alert>
          )}
          {registration.status === 'LOCKED' && (
            <Alert type="error" title="Quán đã bị khóa">
              {registration.statusReason || 'Vui lòng liên hệ quản trị viên.'}
            </Alert>
          )}
          <div className="step-card">
            <RestaurantSummary registration={registration} options={options} />
          </div>
        </>
      ) : (
        <>
          {registration?.status === 'REJECTED' && (
            <Alert type="error" title="Hồ sơ bị từ chối">
              {registration.statusReason ? `Lý do: ${registration.statusReason}. ` : ''}
              Vui lòng chỉnh sửa thông tin và gửi lại.
            </Alert>
          )}

          <div className="progress-card">
            <span className="progress-card__label">Tiến độ đăng ký</span>
            <Stepper
              steps={REGISTRATION_STEPS}
              current={step}
              completed={Math.min(completed, LAST_DATA_STEP)}
              maxReachable={maxReachable}
              onSelect={goTo}
            />
          </div>

          {step === 1 && <BasicStep key={`basic-${registration?.id ?? 'new'}`} registration={registration} options={options} onSaved={handleSaved} />}
          {step === 2 && registration && (
            <RepresentativeStep registration={registration} user={user} onSaved={handleSaved} onBack={() => goTo(1)} />
          )}
          {step === 3 && registration && (
            <BankStep registration={registration} onSaved={handleSaved} onBack={() => goTo(2)} />
          )}
          {step === 4 && registration && (
            <DetailsStep registration={registration} options={options} onSaved={handleSaved} onBack={() => goTo(3)} />
          )}
          {step === 5 && registration && (
            <ReviewStep
              registration={registration}
              options={options}
              onEdit={goTo}
              onBack={() => goTo(4)}
              onSubmitted={handleSubmitted}
            />
          )}
        </>
      )}
    </div>
  );
}
