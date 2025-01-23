main();

async function main() {
  const devices = await (await getDevices()).json();
  console.log('All devices:');
  console.log(JSON.stringify(devices, null, 2));

  
  devices.forEach(async device => {
    if (deviceShouldGetRemoved(device)) {
      console.log('Device ' + device.name + ' should get removed.');
      removeDevice(device.id);
      console.log('Device ' + device.name + ' got removed!');
    } else {
      console.log('Device ' + device.name + ' should NOT get removed.');
    }
  });
}

function getDevices() {
  return fetch('https://api.tailscale.com/api/v2/tailnet/-/devices', {
    headers: {
      Authorization: 'Bearer ' + process.env.TS_API_TOKEN
    }
  });
}

function removeDevice(id) {
  return fetch('https://api.tailscale.com/api/v2/device/' + id, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + process.env.TS_API_TOKEN
    }
  })
}

function deviceShouldGetRemoved(device) {
  return (device.tags.includes('tag:k8s') || device.tags.includes('tag:k8s-operator')) && device.lastSeen < Date.now() - 1000 * 60 * 60;
}
