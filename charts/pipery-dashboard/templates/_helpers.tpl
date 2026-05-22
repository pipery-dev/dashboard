{{- define "pipery-dashboard.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "pipery-dashboard.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "pipery-dashboard.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "pipery-dashboard.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "pipery-dashboard.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "pipery-dashboard.selectorLabels" -}}
app.kubernetes.io/name: {{ include "pipery-dashboard.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "pipery-dashboard.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "pipery-dashboard.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "pipery-dashboard.secretName" -}}
{{- default (printf "%s-secrets" (include "pipery-dashboard.fullname" .)) .Values.secrets.existingSecret -}}
{{- end -}}
