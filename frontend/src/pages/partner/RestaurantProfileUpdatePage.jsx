import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { restaurantProfileUpdateApi } from '../../api/restaurantProfileUpdateApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import useRegistrationOptions from '../../hooks/useRegistrationOptions.js';
import { LAST_DATA_STEP, REGISTRATION_STEPS } from '../../utils/restaurantUtils.js';
import Stepper from '../../components/Stepper.jsx';
import Alert from '../../components/Alert.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import Icon from '../../components/Icon.jsx';
import BasicStep from './steps/BasicStep.jsx';
import RepresentativeStep from './steps/RepresentativeStep.jsx';
import BankStep from './steps/BankStep.jsx';
import DetailsStep from './steps/DetailsStep.jsx';
import ReviewStep from './steps/ReviewStep.jsx';

const asRegistration = value => ({ id: value.restaurantId, restaurantName: value.restaurantName, status: value.status, registrationStep: LAST_DATA_STEP, ...value.proposed });

export default function RestaurantProfileUpdatePage() {
  const { restaurantId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { options, error: optionsError } = useRegistrationOptions();
  const [request, setRequest] = useState(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => { let live = true; restaurantProfileUpdateApi.mine(restaurantId).then(data => { if (live) setRequest(data); }).catch(err => { if (live) setError(getErrorMessage(err, 'Không tải được đề nghị cập nhật.')); }); return () => { live = false; }; }, [restaurantId]);
  const registration = request ? asRegistration(request) : null;
  const updateApi = useMemo(() => ({
    updateBasic: async (_, basic) => { const saved = await restaurantProfileUpdateApi.save(restaurantId, { version: request.version, payload: { ...request.proposed, basic } }); setRequest(saved); return asRegistration(saved); },
    updateRepresentative: async (_, representative) => { const saved = await restaurantProfileUpdateApi.save(restaurantId, { version: request.version, payload: { ...request.proposed, representative } }); setRequest(saved); return asRegistration(saved); },
    updateBank: async (_, bank) => { const saved = await restaurantProfileUpdateApi.save(restaurantId, { version: request.version, payload: { ...request.proposed, bank } }); setRequest(saved); return asRegistration(saved); },
    updateDetails: async (_, details) => { const saved = await restaurantProfileUpdateApi.save(restaurantId, { version: request.version, payload: { ...request.proposed, details } }); setRequest(saved); return asRegistration(saved); },
    submit: async () => { const saved = await restaurantProfileUpdateApi.submit(restaurantId, request.version); setRequest(saved); return asRegistration(saved); },
  }), [restaurantId, request]);
  const goTo = next => { setStep(next); window.scrollTo(0, 0); };
  if (!request && !error) return <FullPageLoader text="Đang tải hồ sơ quán..." />;
  if (error) return <div className="page"><Alert type="error">{error}</Alert><Link to="/partner" className="btn btn--outline"><Icon name="arrowLeft" size={16} />Quán của tôi</Link></div>;
  const locked = request.status === 'PENDING';
  return <div className="page page--wide"><div className="page__head page__head--row"><div><Link to="/partner" className="back-link"><Icon name="arrowLeft" size={16} />Quán của tôi</Link><h1>Đề nghị cập nhật: {request.restaurantName}</h1></div><span className="status-label">{request.status}</span></div>
    <Alert type="info">Trong thời gian chờ duyệt, thông tin hiện tại của quán vẫn hiển thị công khai và quán vẫn nhận đơn bình thường.</Alert>{request.status === 'REJECTED' && <Alert type="error" title="Đề nghị trước bị từ chối">{request.reason || 'Hãy điều chỉnh và gửi lại.'}</Alert>}{locked && <Alert type="warning">Đề nghị đang chờ duyệt. Bạn có thể xem nhưng chưa thể chỉnh sửa.</Alert>}{optionsError && <Alert type="error">{optionsError}</Alert>}
    {!locked && <div className="progress-card"><span className="progress-card__label">Hoàn thiện đề nghị cập nhật</span><Stepper steps={REGISTRATION_STEPS} current={step} completed={Math.min(step - 1, LAST_DATA_STEP)} maxReachable={5} onSelect={goTo} /></div>}
    {locked ? <div className="step-card"><h2>Thông tin đề nghị đã gửi</h2><p>ThunderFood đang đối chiếu thông tin của quán. Bạn sẽ nhận được lý do cụ thể nếu đề nghị bị từ chối.</p></div> : <>{step === 1 && <BasicStep registration={registration} options={options} onSaved={(_, next) => goTo(next)} api={updateApi} />}{step === 2 && <RepresentativeStep registration={registration} user={user} onSaved={(_, next) => goTo(next)} onBack={() => goTo(1)} api={updateApi} />}{step === 3 && <BankStep registration={registration} onSaved={(_, next) => goTo(next)} onBack={() => goTo(2)} api={updateApi} />}{step === 4 && <DetailsStep registration={registration} options={options} onSaved={(_, next) => goTo(next)} onBack={() => goTo(3)} api={updateApi} />}{step === 5 && <ReviewStep registration={registration} options={options} onEdit={goTo} onBack={() => goTo(4)} api={updateApi} submitLabel="Gửi đề nghị cập nhật" onSubmitted={() => navigate('/partner', { replace: true, state: { flash: 'Đã gửi đề nghị cập nhật hồ sơ để ThunderFood duyệt.' } })} />}</>}
  </div>;
}
