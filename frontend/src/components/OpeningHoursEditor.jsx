import { DAYS, timeLabel } from '../utils/restaurantUtils.js';
import Icon from './Icon.jsx';

const MAX_SLOTS = 3;
const DEFAULT_SLOT = { openTime: '08:00', closeTime: '22:00' };

export function hoursToSchedule(list) {
  const schedule = {};
  DAYS.forEach((day) => {
    schedule[day.value] = { enabled: !list || list.length === 0, slots: [{ ...DEFAULT_SLOT }] };
  });
  (list || []).forEach((hour) => {
    const item = schedule[hour.dayOfWeek];
    const slot = { openTime: timeLabel(hour.openTime), closeTime: timeLabel(hour.closeTime) };
    if (!item.enabled) {
      schedule[hour.dayOfWeek] = { enabled: true, slots: [slot] };
    } else {
      item.slots.push(slot);
    }
  });
  return schedule;
}

export function scheduleToHours(schedule) {
  return DAYS.flatMap((day) => {
    const item = schedule[day.value];
    if (!item.enabled) return [];
    return item.slots.map((slot) => ({ dayOfWeek: day.value, openTime: slot.openTime, closeTime: slot.closeTime }));
  });
}

export function validateSchedule(schedule) {
  const enabledDays = DAYS.filter((day) => schedule[day.value].enabled);
  if (enabledDays.length === 0) return 'Vui lòng bật ít nhất một ngày mở cửa';
  for (const day of enabledDays) {
    const slots = [...schedule[day.value].slots].sort((a, b) => a.openTime.localeCompare(b.openTime));
    for (let i = 0; i < slots.length; i += 1) {
      if (!slots[i].openTime || !slots[i].closeTime) return `${day.label}: vui lòng chọn đủ giờ mở và đóng cửa`;
      if (slots[i].closeTime <= slots[i].openTime) return `${day.label}: giờ đóng cửa phải sau giờ mở cửa`;
      if (i > 0 && slots[i].openTime < slots[i - 1].closeTime) return `${day.label}: các khung giờ bị chồng lên nhau`;
    }
  }
  return '';
}

export default function OpeningHoursEditor({ value, onChange, disabled = false }) {
  const update = (day, patch) => onChange({ ...value, [day]: { ...value[day], ...patch } });

  const updateSlot = (day, index, field, fieldValue) =>
    update(day, {
      slots: value[day].slots.map((slot, i) => (i === index ? { ...slot, [field]: fieldValue } : slot)),
    });

  const addSlot = (day) => {
    const slots = value[day].slots;
    const last = slots[slots.length - 1];
    update(day, { slots: [...slots, { openTime: last?.closeTime || '17:00', closeTime: '22:00' }] });
  };

  const removeSlot = (day, index) => update(day, { slots: value[day].slots.filter((_, i) => i !== index) });

  const applyMondayToAll = () => {
    const monday = value[1];
    const next = {};
    DAYS.forEach((day) => {
      next[day.value] = { enabled: monday.enabled, slots: monday.slots.map((slot) => ({ ...slot })) };
    });
    onChange(next);
  };

  return (
    <div className="hours">
      {DAYS.map((day) => {
        const item = value[day.value];
        return (
          <div key={day.value} className={`hours__row ${item.enabled ? '' : 'is-off'}`}>
            <label className="toggle" aria-label={`Mở cửa ${day.label}`}>
              <input
                type="checkbox"
                checked={item.enabled}
                disabled={disabled}
                onChange={(e) =>
                  update(day.value, {
                    enabled: e.target.checked,
                    slots: item.slots.length ? item.slots : [{ ...DEFAULT_SLOT }],
                  })
                }
              />
              <span className="toggle__track">
                <span className="toggle__thumb" />
              </span>
            </label>
            <span className="hours__day">{day.label}</span>
            {item.enabled ? (
              <div className="hours__slots">
                {item.slots.map((slot, index) => (
                  <div key={index} className="hours__slot">
                    <input
                      type="time"
                      className="field__input field__input--time"
                      value={slot.openTime}
                      disabled={disabled}
                      onChange={(e) => updateSlot(day.value, index, 'openTime', e.target.value)}
                      aria-label={`${day.label} giờ mở cửa khung ${index + 1}`}
                    />
                    <span className="hours__dash">–</span>
                    <input
                      type="time"
                      className="field__input field__input--time"
                      value={slot.closeTime}
                      disabled={disabled}
                      onChange={(e) => updateSlot(day.value, index, 'closeTime', e.target.value)}
                      aria-label={`${day.label} giờ đóng cửa khung ${index + 1}`}
                    />
                    {item.slots.length > 1 && !disabled && (
                      <button
                        type="button"
                        className="icon-btn icon-btn--ghost"
                        onClick={() => removeSlot(day.value, index)}
                        aria-label="Xóa khung giờ"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {item.slots.length < MAX_SLOTS && !disabled && (
                  <button type="button" className="hours__add" onClick={() => addSlot(day.value)}>
                    <Icon name="plus" size={14} />
                    Thêm khung giờ
                  </button>
                )}
              </div>
            ) : (
              <span className="hours__closed">Đóng cửa</span>
            )}
          </div>
        );
      })}
      {!disabled && (
        <button type="button" className="link-btn hours__apply" onClick={applyMondayToAll}>
          Áp dụng giờ của Thứ 2 cho tất cả các ngày
        </button>
      )}
    </div>
  );
}
