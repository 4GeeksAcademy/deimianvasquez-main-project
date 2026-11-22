/**
 * HealthCore — Appointment Form Validation
 * 100% vanilla JS. Bilingual (EN / ES). Tailwind classes for UI state.
 */

(function () {
  'use strict';

  var form = document.getElementById('appointment-form');
  if (!form) return;

  // ---- Error messages in both languages ----
  var ERROR_MSGS = {
    en: {
      'first-name': 'First name is required.',
      'last-name': 'Last name is required.',
      'email-req': 'Email address is required.',
      'email-invalid': 'Please enter a valid email address (e.g., name@example.com).',
      'phone-req': 'Phone number is required.',
      'phone-invalid': 'Please enter a valid phone number with 10\u201315 digits.',
      'clinic': 'Please select your preferred clinic.',
      'service': 'Please select a service.',
      'consent': 'You must agree to continue.'
    },
    es: {
      'first-name': 'El nombre es obligatorio.',
      'last-name': 'El apellido es obligatorio.',
      'email-req': 'El correo electr\u00f3nico es obligatorio.',
      'email-invalid': 'Por favor ingresa un correo v\u00e1lido (ej., nombre@ejemplo.com).',
      'phone-req': 'El n\u00famero de tel\u00e9fono es obligatorio.',
      'phone-invalid': 'Por favor ingresa un n\u00famero v\u00e1lido de 10\u201315 d\u00edgitos.',
      'clinic': 'Por favor selecciona tu cl\u00ednica preferida.',
      'service': 'Por favor selecciona un servicio.',
      'consent': 'Debes aceptar para continuar.'
    }
  };

  function getLang() {
    return (window.currentLang) || localStorage.getItem('healthcore-lang') || 'en';
  }

  function msg(key) {
    var lang = getLang();
    return (ERROR_MSGS[lang] && ERROR_MSGS[lang][key]) || ERROR_MSGS.en[key] || '';
  }

  // ---- Field definitions ----
  var fields = [
    {
      id: 'first-name',
      validate: function (value) {
        return value.trim() === '' ? msg('first-name') : '';
      },
    },
    {
      id: 'last-name',
      validate: function (value) {
        return value.trim() === '' ? msg('last-name') : '';
      },
    },
    {
      id: 'email',
      validate: function (value) {
        if (value.trim() === '') return msg('email-req');
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? ''
          : msg('email-invalid');
      },
    },
    {
      id: 'phone',
      validate: function (value) {
        if (value.trim() === '') return msg('phone-req');
        // Accepts: (555) 123-4567, 555-123-4567, 5551234567, +1 555 123 4567
        var cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        return /^\d{10,15}$/.test(cleaned)
          ? ''
          : msg('phone-invalid');
      },
    },
    {
      id: 'clinic',
      validate: function (value) {
        return value === '' ? msg('clinic') : '';
      },
    },
    {
      id: 'service',
      validate: function (value) {
        return value === '' ? msg('service') : '';
      },
    },
    {
      id: 'consent',
      validate: function (checked) {
        return !checked ? msg('consent') : '';
      },
    },
  ];

  // ---- DOM helpers ----
  function getInput(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    if (el.type === 'checkbox') {
      return { value: el.checked, element: el };
    }
    return { value: el.value, element: el };
  }

  function getErrorEl(id) {
    return document.getElementById(id + '-error');
  }

  function showError(id, message) {
    var errorEl = getErrorEl(id);
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  function hideError(id) {
    var errorEl = getErrorEl(id);
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  function setInputErrorStyle(input, hasError) {
    if (hasError) {
      input.classList.add('border-[#B42332]');
      input.classList.remove('border-[#D7E2E1]');
    } else {
      input.classList.remove('border-[#B42332]');
      input.classList.add('border-[#D7E2E1]');
    }
  }

  // ---- Validate a single field ----
  function validateField(fieldDef) {
    var input = getInput(fieldDef.id);
    if (!input) return true;

    var message = fieldDef.validate(input.value);
    var hasError = message !== '';

    if (hasError) {
      showError(fieldDef.id, message);
    } else {
      hideError(fieldDef.id);
    }

    // Set red border on the input itself (not checkbox to keep native look)
    if (input.element.type !== 'checkbox') {
      setInputErrorStyle(input.element, hasError);
    }

    return !hasError;
  }

  // ---- Validate all fields ----
  function validateAll() {
    var allValid = true;
    fields.forEach(function (f) {
      if (!validateField(f)) {
        allValid = false;
      }
    });
    return allValid;
  }

  // ---- Clear all errors ----
  function resetErrors() {
    fields.forEach(function (f) {
      hideError(f.id);
      var input = getInput(f.id);
      if (input && input.element.type !== 'checkbox') {
        setInputErrorStyle(input.element, false);
      }
    });
  }

  // ---- Real-time validation on blur ----
  fields.forEach(function (f) {
    var input = document.getElementById(f.id);
    if (!input) return;

    input.addEventListener('blur', function () {
      validateField(f);
    });

    // Clear error on input (revalidate on keystroke)
    input.addEventListener('input', function () {
      if (this.getAttribute('aria-invalid') === 'true' || this.value.length > 0) {
        validateField(f);
      }
    });

    // For checkbox, validate on change
    if (input.type === 'checkbox') {
      input.addEventListener('change', function () {
        validateField(f);
      });
    }
  });

  // ---- Submit handler ----
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var isValid = validateAll();

    if (!isValid) {
      // Focus first field with error
      for (var i = 0; i < fields.length; i++) {
        var input = document.getElementById(fields[i].id);
        var errorEl = getErrorEl(fields[i].id);
        if (input && errorEl && !errorEl.classList.contains('hidden')) {
          input.focus();
          break;
        }
      }
      return;
    }

    // Success: hide form, show success message
    form.hidden = true;
    var successMsg = document.getElementById('success-message');
    if (successMsg) {
      successMsg.classList.remove('hidden');
      successMsg.focus();
    }
  });

  // ---- Reset handler ----
  var resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      // Native reset clears all fields
      // We also need to clear validation state
      setTimeout(function () {
        resetErrors();
        form.hidden = false;
        var successMsg = document.getElementById('success-message');
        if (successMsg) successMsg.classList.add('hidden');
      }, 0);
    });
  }
})();