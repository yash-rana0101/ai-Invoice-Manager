// frontend/src/components/XeroCallback.jsx
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function XeroCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent multiple executions on the same code
    const currentUrl = window.location.href;
    const lastProcessedUrl = sessionStorage.getItem('xero_last_processed_url');

    if (lastProcessedUrl === currentUrl) {
      console.warn('=== DUPLICATE CALLBACK DETECTED ===');
      console.warn('This URL has already been processed. Redirecting to avoid code reuse.');
      setError('Authorization already processed. Redirecting...');
      setTimeout(() => navigate('/login?error=duplicate_callback'), 1000);
      return;
    }

    // Mark this URL as being processed
    sessionStorage.setItem('xero_last_processed_url', currentUrl);

    const handleXeroCallback = async () => {
      console.log('=== XERO CALLBACK HANDLER STARTED ===');
      console.log('Current URL:', window.location.href);
      console.log('Current pathname:', window.location.pathname);
      console.log('Current search params:', window.location.search);

      try {
        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        console.log('=== URL PARAMETER EXTRACTION ===');
        console.log('Raw search params:', window.location.search);
        console.log('Parsed params object:', Object.fromEntries(params));
        console.log('Authorization code:', code ? `${code.substring(0, 20)}...` : 'NULL');
        console.log('Code length:', code ? code.length : 0);
        console.log('Code contains special chars:', code ? /[<>&"']/.test(code) : false);
        console.log('State parameter:', state);
        console.log('Error parameter:', error);
        console.log('Error description:', errorDescription);

        // Check if this is a page refresh/reload scenario
        const isPageRefresh = performance.getEntriesByType('navigation')[0]?.type === 'reload';
        console.log('Is page refresh/reload:', isPageRefresh);
        if (isPageRefresh) {
          console.warn('⚠️  PAGE REFRESH DETECTED - Authorization code may have been reused');
        }

        // Check for OAuth errors first
        if (error) {
          console.error('=== OAUTH ERROR DETECTED ===');
          console.error('Error type:', error);
          console.error('Error description:', errorDescription);
          console.error('Full error context:', { error, errorDescription, state, code });

          setError(`OAuth error: ${error} - ${errorDescription || 'Unknown error'}`);
          setTimeout(() => navigate('/login?error=oauth_error'), 2000);
          return;
        }

        // Validate required parameters
        if (!code) {
          console.error('=== MISSING AUTHORIZATION CODE ===');
          console.error('No authorization code in URL parameters');
          console.error('Available params:', Object.fromEntries(params));

          setError('No authorization code received from Xero');
          setTimeout(() => navigate('/login?error=no_code'), 2000);
          return;
        }

        // Additional code validation
        if (code.length < 10) {
          console.error('=== SUSPICIOUS AUTHORIZATION CODE ===');
          console.error('Code seems too short:', code.length, 'characters');
          console.error('This might indicate a truncated or corrupted code');
        }

        // Check for URL encoding issues
        const decodedCode = decodeURIComponent(code);
        if (decodedCode !== code) {
          console.log('=== CODE DECODING DETECTED ===');
          console.log('Original code:', code.substring(0, 20) + '...');
          console.log('Decoded code:', decodedCode.substring(0, 20) + '...');
          console.log('Using decoded version for token exchange');
        }

        const finalCode = decodedCode;

        // State validation warning
        if (!state) {
          console.warn('=== STATE PARAMETER WARNING ===');
          console.warn('No state parameter received - this might be a security issue');
          console.warn('Consider implementing proper state validation for CSRF protection');
        }

        // Environment variables validation
        console.log('=== ENVIRONMENT VARIABLES CHECK ===');
        const client_id = `${import.meta.env.VITE_XERO_CLIENT_ID}`;
        const client_secret = `${import.meta.env.VITE_XERO_CLIENT_SECRET}`;
        const callback_url = `${import.meta.env.VITE_XERO_CALLBACK_URL}`;

        console.log('Client ID:', client_id ? `${client_id.substring(0, 8)}...` : 'MISSING');
        console.log('Client Secret:', client_secret ? `${client_secret.substring(0, 8)}...` : 'MISSING');
        console.log('Callback URL:', callback_url);

        if (!client_id || !client_secret || !callback_url) {
          console.error('=== MISSING ENVIRONMENT VARIABLES ===');
          console.error('Missing required environment variables:');
          console.error('VITE_XERO_CLIENT_ID:', !!client_id);
          console.error('VITE_XERO_CLIENT_SECRET:', !!client_secret);
          console.error('VITE_XERO_CALLBACK_URL:', !!callback_url);
          throw new Error('Missing required environment variables');
        }

        // Prepare possible redirect URIs
        const possibleRedirectUris = [callback_url];
        console.log('=== REDIRECT URI CONFIGURATION ===');
        console.log('Possible redirect URIs:', possibleRedirectUris);

        let response;
        let tokenExchangeSuccessful = false;

        // Token exchange attempts
        console.log('=== STARTING TOKEN EXCHANGE ATTEMPTS ===');

        for (let i = 0; i < possibleRedirectUris.length; i++) {
          const redirect_uri = possibleRedirectUris[i];

          console.log(`--- Attempt ${i + 1}/${possibleRedirectUris.length} ---`);
          console.log('Using redirect_uri:', redirect_uri);

          try {
            // Create form data for token exchange
            const tokenData = {
              grant_type: 'authorization_code',
              code: finalCode, // Use the properly decoded code
              redirect_uri: redirect_uri,
            };

            console.log('=== TOKEN EXCHANGE REQUEST PREPARATION ===');
            console.log('Token data object:', {
              grant_type: tokenData.grant_type,
              code: `${tokenData.code.substring(0, 20)}...`,
              redirect_uri: tokenData.redirect_uri
            });

            // Convert object to URL-encoded string
            const formData = new URLSearchParams(tokenData).toString();
            console.log('Form data string:', formData.replace(finalCode, `${finalCode.substring(0, 20)}...`));

            const basicAuth = btoa(`${client_id}:${client_secret}`);
            console.log('Basic auth header:', `Basic ${basicAuth.substring(0, 20)}...`);

            const requestConfig = {
              headers: {
                Authorization: `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
              },
              timeout: 10000,
            };

            console.log('=== SENDING TOKEN EXCHANGE REQUEST ===');
            console.log('URL:', 'https://identity.xero.com/connect/token');
            console.log('Method:', 'POST');
            console.log('Headers:', {
              'Authorization': `Basic ${basicAuth.substring(0, 20)}...`,
              'Content-Type': requestConfig.headers['Content-Type'],
              'Accept': requestConfig.headers['Accept']
            });
            console.log('Body (form-encoded):', formData.replace(finalCode, `${finalCode.substring(0, 20)}...`));
            console.log('Timeout:', requestConfig.timeout);

            // Send the form-encoded string as body
            const startTime = Date.now();
            response = await axios.post('https://identity.xero.com/connect/token', formData, requestConfig);
            const endTime = Date.now();

            console.log('=== TOKEN EXCHANGE SUCCESS ===');
            console.log(`Request completed in ${endTime - startTime}ms`);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            console.log('Response data keys:', Object.keys(response.data));
            console.log('Token type:', response.data.token_type);
            console.log('Expires in:', response.data.expires_in);
            console.log('Access token:', response.data.access_token ? `${response.data.access_token.substring(0, 20)}...` : 'MISSING');
            console.log('Refresh token:', response.data.refresh_token ? `${response.data.refresh_token.substring(0, 20)}...` : 'MISSING');
            console.log('ID token:', response.data.id_token ? `${response.data.id_token.substring(0, 20)}...` : 'MISSING');

            tokenExchangeSuccessful = true;
            console.log(`✅ Token exchange successful with redirect_uri: ${redirect_uri}`);
            break; // Exit loop on success

          } catch (attemptError) {
            console.error(`=== TOKEN EXCHANGE ATTEMPT ${i + 1} FAILED ===`);
            console.error('Failed redirect_uri:', redirect_uri);
            console.error('Error type:', attemptError.constructor.name);
            console.error('Error message:', attemptError.message);

            if (attemptError.response) {
              console.error('Response status:', attemptError.response.status);
              console.error('Response headers:', attemptError.response.headers);
              console.error('Response data:', attemptError.response.data);
              console.error('Response status text:', attemptError.response.statusText);

              // Specific handling for invalid_grant
              if (attemptError.response.data?.error === 'invalid_grant') {
                console.error('=== INVALID_GRANT ERROR ANALYSIS ===');
                console.error('This error typically means:');
                console.error('1. Authorization code has already been used');
                console.error('2. Authorization code has expired (usually 10 minutes)');
                console.error('3. Redirect URI mismatch between auth request and token exchange');
                console.error('4. Code was corrupted during transmission');
                console.error('');
                console.error('Recommendations:');
                console.error('- Ensure you are not refreshing this page');
                console.error('- Check that redirect_uri exactly matches the one used in initial auth request');
                console.error('- Verify the authorization flow completes within 10 minutes');
                console.error('- Start a fresh authorization flow');
              }
            } else if (attemptError.request) {
              console.error('Request was made but no response received');
              console.error('Request details:', attemptError.request);
            } else {
              console.error('Error setting up request:', attemptError.message);
            }

            // If this is the last attempt, throw the error
            if (i === possibleRedirectUris.length - 1) {
              console.error('=== ALL TOKEN EXCHANGE ATTEMPTS EXHAUSTED ===');
              throw attemptError;
            } else {
              console.log(`Trying next redirect URI...`);
            }
          }
        }

        if (!tokenExchangeSuccessful) {
          console.error('=== TOKEN EXCHANGE COMPLETELY FAILED ===');
          throw new Error('All token exchange attempts failed');
        }

        console.log('=== TOKEN STORAGE PROCESS STARTED ===');

        // Store tokens
        const { access_token, refresh_token, id_token, expires_in, token_type } = response.data;

        if (!access_token) {
          console.error('=== ACCESS TOKEN MISSING ===');
          console.error('Response data:', response.data);
          throw new Error('No access token received from Xero');
        }

        // Store tokens in localStorage
        console.log('=== STORING TOKENS IN LOCALSTORAGE ===');

        localStorage.setItem('token', access_token);
        console.log('✅ Access token stored');

        if (refresh_token) {
          localStorage.setItem('xero_refresh_token', refresh_token);
          console.log('✅ Refresh token stored');
        } else {
          console.warn('⚠️  No refresh token received');
        }

        if (id_token) {
          localStorage.setItem('xero_id_token', id_token);
          console.log('✅ ID token stored');
        } else {
          console.warn('⚠️  No ID token received');
        }

        // Store token expiry
        if (expires_in) {
          const expiryTime = Date.now() + (expires_in * 1000);
          localStorage.setItem('xero_token_expiry', expiryTime.toString());
          console.log('✅ Token expiry stored:', new Date(expiryTime).toISOString());
          console.log('Token expires in:', expires_in, 'seconds');
        } else {
          console.warn('⚠️  No expiry time received');
        }

        // Optional: Decode and store user info from id_token
        if (id_token) {
          console.log('=== DECODING ID TOKEN ===');
          try {
            // Simple JWT decode (without verification - for display purposes only)
            const tokenParts = id_token.split('.');
            console.log('ID token parts count:', tokenParts.length);

            if (tokenParts.length === 3) {
              const base64Url = tokenParts[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const userInfo = JSON.parse(jsonPayload);

              console.log('✅ ID token decoded successfully');
              console.log('User info keys:', Object.keys(userInfo));
              console.log('User email:', userInfo.email);
              console.log('User name:', userInfo.name || userInfo.given_name + ' ' + userInfo.family_name);
              console.log('Token issued at:', new Date(userInfo.iat * 1000).toISOString());
              console.log('Token expires at:', new Date(userInfo.exp * 1000).toISOString());

              localStorage.setItem('xero_user_info', JSON.stringify(userInfo));
              console.log('✅ User info stored in localStorage');
            } else {
              console.warn('⚠️  ID token doesn\'t have expected format (3 parts)');
            }
          } catch (decodeError) {
            console.error('=== ID TOKEN DECODE FAILED ===');
            console.error('Decode error:', decodeError);
            console.error('ID token (first 50 chars):', id_token.substring(0, 50) + '...');
          }
        }

        console.log('=== AUTHENTICATION PROCESS COMPLETE ===');
        console.log('✅ All tokens stored successfully');

        // Force a small delay to ensure localStorage is written and can be read
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify tokens are actually stored
        console.log('=== VERIFYING TOKEN STORAGE ===');
        console.log('Token stored:', !!localStorage.getItem('token'));
        console.log('Refresh token stored:', !!localStorage.getItem('xero_refresh_token'));
        console.log('Expiry stored:', !!localStorage.getItem('xero_token_expiry'));
        console.log('User info stored:', !!localStorage.getItem('xero_user_info'));

        // Trigger auth context refresh
        if (window.authContext && typeof window.authContext.checkAuth === 'function') {
          console.log('Triggering auth context refresh...');
          const authResult = window.authContext.checkAuth();
          console.log('Auth context refresh result:', authResult);
        } else {
          console.warn('Auth context not available or checkAuth not a function');
        }

        // Dispatch a custom event to notify other components
        console.log('Dispatching xero-auth-success event...');
        window.dispatchEvent(new CustomEvent('xero-auth-success', {
          detail: {
            tokens: response.data,
            timestamp: Date.now()
          }
        }));

        console.log('Redirecting to home page...');

        // Use replace to avoid back button issues and clear the callback URL
        navigate('/', { replace: true });
        return;

      } catch (error) {
        console.error('=== CRITICAL ERROR IN CALLBACK HANDLER ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        let errorMessage = 'Token exchange failed';

        if (error.response) {
          console.error('=== SERVER ERROR RESPONSE ===');
          console.error('Status:', error.response.status);
          console.error('Status text:', error.response.statusText);
          console.error('Headers:', error.response.headers);
          console.error('Data:', error.response.data);

          if (error.response.data && error.response.data.error) {
            errorMessage = `${error.response.data.error}: ${error.response.data.error_description || 'Unknown error'}`;
            console.error('Xero error code:', error.response.data.error);
            console.error('Xero error description:', error.response.data.error_description);
          } else if (error.response.status === 400) {
            errorMessage = 'Bad Request - Check your client credentials and redirect URI';
            console.error('Likely causes: Invalid client_id, client_secret, redirect_uri mismatch, or expired/invalid code');
          } else if (error.response.status === 401) {
            errorMessage = 'Unauthorized - Invalid client credentials';
            console.error('Check your VITE_XERO_CLIENT_ID and VITE_XERO_CLIENT_SECRET');
          } else {
            console.error('Unexpected HTTP status code');
          }
        } else if (error.request) {
          console.error('=== NETWORK ERROR ===');
          console.error('Request was made but no response received');
          console.error('Network error details:', error.request);
          errorMessage = 'Network error - Could not reach Xero token endpoint';
        } else {
          console.error('=== SETUP ERROR ===');
          console.error('Error setting up the request:', error.message);
          errorMessage = error.message || 'Unknown error occurred';
        }

        console.error('Final error message to display:', errorMessage);
        setError(errorMessage);

        // Redirect to login with error after showing message
        console.log('Redirecting to login page in 3 seconds...');
        setTimeout(() => {
          navigate('/login?error=token_exchange_failed');
        }, 3000);
      } finally {
        console.log('=== CALLBACK HANDLER CLEANUP ===');
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    handleXeroCallback();
  }, [navigate]);

  // Render loading or error state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: '20px'
      }}>
        <div>Processing Xero login...</div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Please wait while we complete your authentication.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: '20px',
        color: '#d32f2f'
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>Authentication Error</div>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>{error}</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Redirecting to login page...
        </div>
      </div>
    );
  }

  return null;
}