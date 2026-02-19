<script>
  import { CwButton, CwInput, CwTooltip } from '@cropwatchdevelopment/cwui';

  let email = $state('');
</script>

<CwTooltip value="Enter your email address" tone="info">
  <CwInput
    label="Email"
    type="email"
    placeholder="user@example.com"
    bind:value={email}
  />
</CwTooltip>

<CwButton variant="primary" onclick={() => alert(email)}>
  Submit
</CwButton>