package ar.alertar.app;

import android.util.Base64;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.CredentialManagerCallback;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.security.SecureRandom;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        String clientId = call.getString("serverClientId");
        if (clientId == null || clientId.isBlank()) {
            call.reject("Falta configurar el cliente de Google");
            return;
        }

        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String nonce = Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        GetSignInWithGoogleOption opcion = new GetSignInWithGoogleOption.Builder(clientId)
            .setNonce(nonce)
            .build();
        GetCredentialRequest solicitud = new GetCredentialRequest.Builder()
            .addCredentialOption(opcion)
            .build();

        CredentialManager.create(getActivity()).getCredentialAsync(
            getActivity(), solicitud, null, ContextCompat.getMainExecutor(getActivity()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse respuesta) {
                    Credential credencial = respuesta.getCredential();
                    if (!(credencial instanceof CustomCredential) ||
                        !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credencial.getType())) {
                        call.reject("Google devolvió una credencial incompatible");
                        return;
                    }
                    try {
                        GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(credencial.getData());
                        JSObject datos = new JSObject();
                        datos.put("idToken", google.getIdToken());
                        datos.put("nonce", nonce);
                        call.resolve(datos);
                    } catch (RuntimeException error) {
                        call.reject("No se pudo leer la respuesta de Google");
                    }
                }

                @Override
                public void onError(GetCredentialException error) {
                    if (error instanceof GetCredentialCancellationException) {
                        call.reject("Cerraste la ventana de Google", "GOOGLE_CANCELLED");
                    } else {
                        call.reject("No se pudo abrir Google. Revisá la configuración de acceso Android.", "GOOGLE_NATIVE_ERROR");
                    }
                }
            }
        );
    }
}
