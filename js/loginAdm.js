const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector("#password-toggle");
const loginButton = document.querySelector("#login-button");
const formMessage = document.querySelector("#form-message");
const successModal = document.querySelector("#success-modal");

function setMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.classList.toggle("success", type === "success");
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "Entrando..." : "Entrar";
}

function setLoginErrorState(hasError) {
  emailInput.classList.toggle("is-invalid", hasError);
  passwordInput.classList.toggle("is-invalid", hasError);
  passwordInput.closest(".password-field").classList.toggle("is-invalid", hasError);
}

function clearLoginInputs() {
  emailInput.value = "";
  passwordInput.value = "";
}

function showSuccessModal() {
  successModal.classList.add("is-open");
  successModal.setAttribute("aria-hidden", "false");
}

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener("input", () => {
    setLoginErrorState(false);
    setMessage("");
  });
});

passwordToggle.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";

  passwordInput.type = isPassword ? "text" : "password";
  passwordToggle.textContent = isPassword ? "Ocultar" : "Mostrar";
  passwordToggle.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
});

window.addEventListener("load", async () => {
  if (!window.gelimoSupabase) {
    return;
  }

  await window.gelimoSupabase.auth.signOut();
  clearLoginInputs();
  setLoginErrorState(false);
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!window.gelimoSupabase) {
    setMessage("Email ou senha incorretos. Verifique os dados e tente novamente.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  setLoading(true);
  setMessage("");
  setLoginErrorState(false);
  clearLoginInputs();

  let error = null;

  try {
    const response = await window.gelimoSupabase.auth.signInWithPassword({
      email,
      password,
    });

    error = response.error;
  } catch (requestError) {
    error = requestError;
  }

  setLoading(false);

  if (error) {
    setMessage("Email ou senha incorretos. Verifique os dados e tente novamente.");
    setLoginErrorState(true);
    emailInput.focus();
    return;
  }

  setMessage("");
  showSuccessModal();

  setTimeout(() => {
    window.location.href = "admin.html";
  }, 2200);
});
