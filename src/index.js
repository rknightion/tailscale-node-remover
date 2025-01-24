main();

async function main() {
  console.log(process.env);

  const devices = await (await getDevices()).json();
  console.log('All devices:');
  console.log(JSON.stringify(devices, null, 2));

  devices.devices.forEach(async device => {
    if (shouldDeviceGetRemoved(device)) {
      console.log('Device ' + device.name + ' should get removed.');
      removeDevice(device.id);
    } else {
      console.log('Device ' + device.name + ' should NOT get removed.');
    }
  });
}

function getDevices() {
  return fetch(process.env.TS_API_URL + '/tailnet/' + process.env.TS_TAILNET + '/devices', {
    headers: {
      Authorization: 'Bearer ' + process.env.TS_API_TOKEN
    }
  });
}

function removeDevice(id) {
  return fetch(process.env.TS_API_URL + '/device/' + id, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + process.env.TS_API_TOKEN
    }
  })
}

function shouldDeviceGetRemoved(device) {
  return (typeof process.env.TS_TAGS !== 'undefined' && typeof device.tags !== 'undefined' && process.env.TS_TAGS.split(", ").some(tag => device.tags.includes(tag))) && Date.parse(device.lastSeen) < Date.now() - 1000 * process.env.TS_TIMEOUT;
}
