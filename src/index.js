main();

async function main() {
  try {
    const devicesResponse = await getDevices();
    const devices = await devicesResponse.json();
    console.log('All devices:');
    console.log(JSON.stringify(devices, null, 2));

    let removedDevices = [];
    let totalDevices = devices.devices.length;
    let matchedCriteria = 0;
    let successfullyDeleted = 0;
    let failedDeletions = 0;

    // Use for...of with await instead of forEach
    for (const device of devices.devices) {
      if (shouldDeviceGetRemoved(device)) {
        matchedCriteria++;
        console.log(`Should get removed:    ${device.name} (${device.id})`);

        const dryRun = process.env.TS_DRY_RUN === 'true';
        if (dryRun) {
          console.log(`[DRY RUN] Would delete: ${device.name}`);
          removedDevices.push({
            id: device.id,
            name: device.name
          });
          successfullyDeleted++;
        } else {
          try {
            const response = await removeDevice(device.id);
            if (response.ok) {
              console.log(`Successfully deleted: ${device.name}`);
              removedDevices.push({
                id: device.id,
                name: device.name
              });
              successfullyDeleted++;
            } else {
              console.error(`Failed to delete ${device.name}: HTTP ${response.status}`);
              failedDeletions++;
            }
          } catch (error) {
            console.error(`Error deleting ${device.name}: ${error.message}`);
            failedDeletions++;
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log(`Should NOT get removed: ${device.name}`);
      }
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total devices: ${totalDevices}`);
    console.log(`Matched deletion criteria: ${matchedCriteria}`);
    console.log(`Successfully deleted: ${successfullyDeleted}`);
    if (failedDeletions > 0) {
      console.log(`Failed deletions: ${failedDeletions}`);
    }

    const core = require('@actions/core');
    core.setOutput('removed_nodes', JSON.stringify(removedDevices));
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
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
