import { createDeskThing } from '@deskthing/server';
import { AppSettings, DESKTHING_EVENTS, SETTING_TYPES } from '@deskthing/types';
import dotenv from 'dotenv';
import { saveImageReferenceFromURL } from './utils';

dotenv.config();

type ToClientData = {
  type: 'imageData', payload: string
}

enum IMAGE_REQUESTS {
  GET = 'get'
}

type GenericTransitData = {
  type: IMAGE_REQUESTS.GET, request: 'image', payload?: string
}

const DeskThing = createDeskThing<GenericTransitData, ToClientData>()
let va: any = 0

const sendImage = (imageUrls: string[]) => {
  const imageUrl: string = imageUrls[Math.floor(Math.random() * imageUrls.length)]
  console.error(imageUrl)
  console.error(imageUrls.join(", "))

  DeskThing.send({
    type: 'imageData', payload: imageUrl
  });
}




const sendImageToClient = async (imagePath: string) => {
  try {
    const imageUrl = process.env.DESKTHING_ENV == 'development' ? imagePath : await saveImageReferenceFromURL(imagePath)

    if (!imageUrl) {
      console.error('Error saving image reference');
      return;
    }

    console.debug('Sending Image ' + imageUrl + ' to client')

    if (typeof imageUrl == "object") {
      sendImage(imageUrl)
    } else {
      DeskThing.send({
        type: 'imageData', payload: imageUrl
      });
    }
  } catch (error) {
    console.error('Error reading image file: ' + error);
  }
};

const start = async () => {
  const settings: AppSettings = {
    image_source: {
      value: '',
      id: 'image_source',
      type: SETTING_TYPES.STRING,
      label: "Image URL",
      description: 'Use a file path or a web url that will be used to fetch the image',
    },
    image_directory: {
      value: '',
      id: 'image_directory',
      type: SETTING_TYPES.STRING,
      label: "Image FILE",
      description: 'Shortcut for selecting an image file from your computer',
      // fileTypes: [
      //   {
      //     name: 'Image Directory',
      //     extensions: ["*"]
      //   },
      //   {
      //     name: 'Image Files',
      //     extensions: ["*"]
      //   }
      // ]
    },
  }
  DeskThing.initSettings(settings)
}

const stop = async () => {
  // Function called when the server is stopped
}

DeskThing.on(DESKTHING_EVENTS.SETTINGS, async (setting) => {
  // First check if there is an image file provided
  if (setting.payload.image_directory.value && setting.payload.image_directory.type == SETTING_TYPES.STRING) {
    DeskThing.setSettings({
      image_source: {
        value: setting.payload.image_directory.value, // sets the value to the image_directory value
        id: 'image_source',
        type: SETTING_TYPES.STRING,
        label: "Image URL",
        description: 'Use a file path or a web url that will be used to fetch the image',
      },
      image_directory: {
        value: '',
        id: 'image_directory',
        type: SETTING_TYPES.STRING,
        label: "Image FILE",
        description: 'Shortcut for selecting an image file from your computer',
      }
    });
    await sendImageToClient(setting.payload.image_directory.value);
  } else if (setting.payload.image_source.value && setting.payload.image_source.type == SETTING_TYPES.STRING) {
    await sendImageToClient(setting.payload.image_source.value);
  } else {
    console.warn('No image source found in settings!');
  }


})

DeskThing.on(IMAGE_REQUESTS.GET, async (data) => {
  if (data.type == null) {
    console.warn('No args provided!')
    return
  }
  switch (data.request) {
    case 'image':
      const Data = await DeskThing.getSettings()
      if (Data?.image_source.value && Data.image_source.type == SETTING_TYPES.STRING) {
        await sendImageToClient(Data?.image_source.value)
      } else {
        console.warn('No image source found!')
      }
      break
    default:
      console.warn(`Unknown request: ${data.request}`)
      break
    // Handle other types ?
  }
})

// Main Entrypoint of the server
DeskThing.on(DESKTHING_EVENTS.START, start)

// Main exit point of the server
DeskThing.on(DESKTHING_EVENTS.STOP, stop)