const fs = require('fs');

let content = fs.readFileSync('src/features/auth/LoginPage.tsx', 'utf-8');

if (!content.includes('import { FieldError }')) {
  content = content.replace(
    /import \{ PasswordInput \} from '.\/PasswordInput'/,
    "import { PasswordInput } from './PasswordInput'\nimport { FieldError } from '@/components/FieldError'"
  );
}

content = content.replace(
  /\{signupForm\.formState\.errors\.name && \(\s*<p className="text-xs font-bold text-\[#FF5F1F\]" role="alert">\s*\{signupForm\.formState\.errors\.name\.message\}\s*<\/p>\s*\)\}/g,
  "<FieldError error={signupForm.formState.errors.name?.message} />"
);

content = content.replace(
  /\{signupForm\.formState\.errors\.preferred_name && \(\s*<p className="text-xs font-bold text-\[#FF5F1F\]" role="alert">\s*\{signupForm\.formState\.errors\.preferred_name\.message\}\s*<\/p>\s*\)\}/g,
  "<FieldError error={signupForm.formState.errors.preferred_name?.message} />"
);

content = content.replace(
  /\{signupForm\.formState\.errors\.email && \(\s*<p className="text-xs font-bold text-\[#FF5F1F\]" role="alert">\s*\{signupForm\.formState\.errors\.email\.message\}\s*<\/p>\s*\)\}/g,
  "<FieldError error={signupForm.formState.errors.email?.message} />"
);

content = content.replace(
  /\{signupForm\.formState\.errors\.password && \(\s*<p className="text-xs font-bold text-\[#FF5F1F\]" role="alert">\s*\{signupForm\.formState\.errors\.password\.message\}\s*<\/p>\s*\)\}/g,
  "<FieldError error={signupForm.formState.errors.password?.message} />"
);

content = content.replace(
  /\{loginForm\.formState\.errors\.email && \(\s*<p className="text-xs font-bold text-\[#FF5F1F\]" role="alert">\s*\{loginForm\.formState\.errors\.email\.message\}\s*<\/p>\s*\)\}/g,
  "<FieldError error={loginForm.formState.errors.email?.message} />"
);

content = content.replace(
  /\{loginForm\.formState\.errors\.password && \(\s*<p className="text-xs font-bold text-\[#FF5F1F\]" role="alert">\s*\{loginForm\.formState\.errors\.password\.message\}\s*<\/p>\s*\)\}/g,
  "<FieldError error={loginForm.formState.errors.password?.message} />"
);

content = content.replace(
  /\{emailForm\.formState\.errors\.email && \(\s*<p className="text-xs font-bold text-\[#FF5F1F\]" role="alert">\s*\{emailForm\.formState\.errors\.email\.message\}\s*<\/p>\s*\)\}/g,
  "<FieldError error={emailForm.formState.errors.email?.message} />"
);

content = content.replace(
  /\{requestError && \(\s*<p className="text-xs font-bold text-\[#FF5F1F\]" role="alert">\s*\{requestError\}\s*<\/p>\s*\)\}/g,
  "<FieldError error={requestError ?? undefined} />"
);

fs.writeFileSync('src/features/auth/LoginPage.tsx', content);
