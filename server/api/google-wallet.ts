import { GoogleAuth } from 'google-auth-library';
import { defineEventHandler, readBody } from 'h3';
import jwt from 'jsonwebtoken';

const issuerId = '3388000000023034095';
const classId = `${issuerId}.codelab_class`;

const init = () => {
  const config = useRuntimeConfig();

  const credentials = config.googleApplicationCredentialsJson;

  if (typeof credentials !== 'object')
    throw new Error('Invalid Google Application Credentials');

  new GoogleAuth({
    credentials: credentials,
    scopes: 'https://www.googleapis.com/auth/wallet_object.issuer'
  });

  return credentials;
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const operationalPublicKey = body.operationalPublicKey;

  if (!operationalPublicKey)
    return { error: 'Missing operationalPublicKey' };

  const credentials = init();
  const barcodeValue = `${body.baseUrl}/tokens/send-token?to=${operationalPublicKey}`;

  console.log('Creating QR code leading to:', barcodeValue);

  if (!credentials.client_email || !credentials.private_key)
    throw createError({ statusCode: 500, message: 'Invalid service account credentials' });

  // Use service account email for object suffix
  const objectSuffix = `${credentials.client_email.replace(/[^\w.-]/g, '_')}`;
  const objectId = `${issuerId}.${objectSuffix}`;

  const genericObject = {
    'id': `${objectId}`,
    'classId': classId,
    'genericType': 'GENERIC_TYPE_UNSPECIFIED',
    'hexBackgroundColor': '#e62525',
    'logo': {
      'sourceUri': {
        'uri': 'https://media.licdn.com/dms/image/v2/C560BAQEj8gDq4ohhoQ/company-logo_200_200/company-logo_200_200/0/1630629402152?e=2147483647&v=beta&t=WZow0_vCgExHDDmERSks6s_teABUIkfcaQDuA5oBegM'
      }
    },
    'cardTitle': {
      'defaultValue': {
        'language': 'en',
        'value': 'hallmann at HTM'
      }
    },
    'subheader': {
      'defaultValue': {
        'language': 'en',
        'value': 'HTM Account'
      }
    },
    'header': {
      'defaultValue': {
        'language': 'en',
        'value': 'hallmann'
      }
    },
    'barcode': {
      'type': 'QR_CODE',
      'value': barcodeValue
    },
    'textModulesData': [
      {
        'header': 'Public Key',
        'body': operationalPublicKey,
        'id': 'publickey'
      },
      {
        'header': 'Key',
        'body': 'Operational',
        'id': 'keytype'
      }
    ]
  };

  // JWT claims
  const claims = {
    iss: credentials.client_email,
    aud: 'google',
    origins: [],
    typ: 'savetowallet',
    payload: {
      genericObjects: [genericObject]
    }
  };

  const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
  const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

  return { url: saveUrl };
});
