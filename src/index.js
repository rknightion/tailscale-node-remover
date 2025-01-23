main();

async function main() {
  const devices = await getDevices().json();

  devices.forEach(async device => {
    const device = await getDevice(device.id).json();
    if (deviceShouldBeRemoved(device)) {
      removeDevice(device.id);
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

function getDevice(id) {
  return fetch('https://api.tailscale.com/api/v2/tailnet/-/device/' + id, {
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

function deviceShouldBeRemoved(device) {
  return (device.tags.includes('tag:k8s') || device.tags.includes('tag:k8s-operator')) && device.lastSeen < Date.now() - 1000 * 60 * 60;
}
