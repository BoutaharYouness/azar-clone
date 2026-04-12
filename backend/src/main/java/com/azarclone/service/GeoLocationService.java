package com.azarclone.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Resolves country information from an IP address using the free ip-api.com service.
 * Falls back to "Unknown" if the lookup fails.
 */
@Service
public class GeoLocationService {

    private static final Logger log = LoggerFactory.getLogger(GeoLocationService.class);

    @Value("${app.geo.api-url}")
    private String geoApiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Look up the country for the given IP address.
     *
     * @param ip client IP address
     * @return country name, or "Unknown"
     */
    @SuppressWarnings("unchecked")
    public String resolveCountry(String ip) {
        if (ip == null || ip.isBlank() || ip.equals("127.0.0.1") || ip.startsWith("192.168")) {
            return "Local";
        }
        try {
            Map<String, Object> response = restTemplate.getForObject(geoApiUrl + ip, Map.class);
            if (response != null && "success".equals(response.get("status"))) {
                return (String) response.getOrDefault("country", "Unknown");
            }
        } catch (Exception e) {
            log.warn("Geo lookup failed for IP {}: {}", ip, e.getMessage());
        }
        return "Unknown";
    }
}
