const os = require("node:os");

// Interface name patterns to exclude when listing "share with judges" URLs.
// These cover macOS VPN/tunnel/Apple-internal interfaces and common Linux/Windows
// virtual interfaces from VPN clients, Docker, VirtualBox, VMware, etc.
const VIRTUAL_IFACE = /^(utun|ppp|tun|tap|awdl|llw|anpi|ipsec|vboxnet|vmnet|vnic|veth|docker|br-|bridge|zt)/i;

function isVirtualIface(name) {
  return VIRTUAL_IFACE.test(name);
}

function isPrivateIPv4(addr) {
  // Standard RFC1918 ranges only — link-local 169.254/16 is excluded because it
  // means the interface failed to get a DHCP lease and is almost never reachable
  // from a tablet/phone in a rodeo venue WiFi setup.
  return (
    /^10\./.test(addr) ||
    /^192\.168\./.test(addr) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(addr)
  );
}

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    if (isVirtualIface(name)) continue;
    for (const ni of nets[name] || []) {
      if (ni.family !== "IPv4") continue;
      if (ni.internal) continue;
      if (!isPrivateIPv4(ni.address)) continue;
      out.push({ iface: name, address: ni.address });
    }
  }
  return out;
}

module.exports = { getLanAddresses, isVirtualIface, isPrivateIPv4 };
