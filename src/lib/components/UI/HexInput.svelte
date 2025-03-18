<script>
    // This variable holds the formatted DevEUI value.
    let devEui = "";
  
    /**
     * This function:
     *   1. Removes any character that is not a hex digit.
     *   2. Limits the input to 16 hex characters.
     *   3. Inserts a colon after every two characters.
     */
    function handleInput(event) {
      // Remove all characters except hex digits (0-9, a-f, A-F)
      let raw = event.target.value.replace(/[^0-9A-Fa-f]/g, '');
      // Limit to 16 characters (8 bytes)
      raw = raw.substring(0, 16);
      // Group the hex digits in pairs and join with a colon.
      const pairs = raw.match(/.{1,2}/g);
      devEui = pairs ? pairs.join(':') : '';
    }
  </script>
  
  <style>
    /* Optional styling for the input */
    input {
      font-size: 1rem;
      padding: 0.5rem;
      width: 100%;
      max-width: 300px;
    }
  </style>
  
  <input
    type="text"
    placeholder="XX:XX:XX:XX:XX:XX:XX:XX"
    on:input={handleInput}
    value={devEui} />
    
  <!-- For debugging purposes you might want to display the current value -->
  <p>DevEUI: {devEui}</p>
  