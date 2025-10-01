main();

async function main() {
  const devices = await (await getDevices()).json();
  console.log('All devices:');
  console.log(JSON.stringify(devices, null, 2));

  let removedDevices = [];
  
  devices.devices.forEach(async device => {
    if (shouldDeviceGetRemoved(device)) {
      console.log('Should get removed:    ' + device.name);
      removeDevice(device.id);
      removedDevices.push(device);
    } else {
      console.log('Should NOT get removed:' + device.name);
    }
  });

  const core = require('@actions/core');
  core.setOutput('removed_nodes', JSON.stringify(removedDevices));
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
  // Check if device has passed the timeout threshold
  const hasTimedOut = Date.parse(device.lastSeen) < Date.now() - 1000 * process.env.TS_TIMEOUT;
  if (!hasTimedOut) {
    return false;
  }

  // Check tag inclusion filter
  const hasIncludeTags = typeof process.env.TS_TAGS !== 'undefined' && process.env.TS_TAGS.trim() !== '';
  const hasDeviceTags = typeof device.tags !== 'undefined';

  if (hasIncludeTags && hasDeviceTags) {
    const includeTags = process.env.TS_TAGS.split(',').map(tag => tag.trim());
    const matchesInclude = includeTags.some(tag => device.tags.includes(tag));
    if (!matchesInclude) {
      return false;
    }
  } else if (hasIncludeTags && !hasDeviceTags) {
    // Device has no tags but include filter is set - don't remove
    return false;
  }

  // Check tag exclusion filter
  const hasExcludeTags = typeof process.env.TS_EXCLUDE_TAGS !== 'undefined' && process.env.TS_EXCLUDE_TAGS.trim() !== '';
  if (hasExcludeTags && hasDeviceTags) {
    const excludeTags = process.env.TS_EXCLUDE_TAGS.split(',').map(tag => tag.trim());
    const matchesExclude = excludeTags.some(tag => device.tags.includes(tag));
    if (matchesExclude) {
      return false; // Don't remove if device has an excluded tag
    }
  }

  return true;
}
